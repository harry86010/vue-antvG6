<template>
  <el-row :gutter="10" class="container">
    <el-col :span="24">
      <div class="itemBox" :span="24">
        <el-row :gutter="10" class="flex-box">
          <el-col :span="6">
            <span class="label">标签名称</span>
            <el-autocomplete
              v-model="searchParam.searchLabel"
              :fetch-suggestions="getLabelList"
              placeholder="请输入标签名"
              @select="handleSelect"
              class="el-select"
            ></el-autocomplete>
          </el-col>
          <el-col :span="6">
            <span class="label">节点状态</span>
            <el-select
              v-model="searchParam.searchItemStatus"
              placeholder="请选择节点状态"
              @change="searchFn"
            >
              <el-option
                v-for="(item, index) in itemStatusList"
                :key="index"
                :label="item"
                :value="index"
              />
            </el-select>
          </el-col>
          <el-col :span="2">
            <el-button @click="searchResetFn">重置条件</el-button>
          </el-col>
          <el-col :span="2" class="mt10">
            <el-checkbox v-model="searchParam.radioTime" @change="isShowTimeinfo"
              >显示时间</el-checkbox
            >
          </el-col>
          <el-col :span="2" class="mt10">
            <el-checkbox v-model="searchParam.radioItemStatus" @change="isShowItemStatus"
              >显示状态</el-checkbox
            >
          </el-col>
          <el-col :span="2">
            <el-button type="" @click="downloadImage">导出</el-button>
          </el-col>
        </el-row>

        <div class="canvaBox">
          <div class="minimap"></div>
          <!-- 树图相关 -->
          <div id="treeDiv" class="whr100"></div>
          <!-- 重命名节点Dialog -->
          <el-dialog
            title="提示"
            :visible.sync="renameDialogVisible"
            width="30%"
            :before-close="editDialogClose"
          >
            <el-input v-model="inputLabel.name" placeholder="请输入"></el-input>
            <span slot="footer" class="dialog-footer">
              <el-button @click="renameDialogVisible = false">取 消</el-button>
              <el-button type="primary" @click="renameSubmit">确 定</el-button>
            </span>
          </el-dialog>
          <!-- 删除dialog -->
          <el-dialog
            title="提示"
            :visible.sync="delDialogVisible"
            width="20%"
            :before-close="delDialogClose"
          >
            <div class="title">是否确认删除？</div>
            <span slot="footer" class="dialog-footer">
              <el-button @click="delDialogVisible = false">取 消</el-button>
              <el-button type="primary" @click="delSubmit">确 定</el-button>
            </span>
          </el-dialog>
        </div>
      </div>
      <el-progress
        stroke-width="100%"
        :text-inside="true"
        stroke-linecap="square"
        :stroke-width="26"
        :percentage="progress.percentage"
      ></el-progress>
    </el-col>

    <el-drawer
      title="节点信息"
      :visible.sync="dataInfoDrawerVisible"
      class="dataInfo-drawer-dialog"
      @close="dataInfoClose"
      size="50%"
    >
      <el-form ref="dataInfoForm" :model="dataInfoForm" label-width="90px">
        <el-form-item label="节点名称">
          <el-col :span="11">
            <el-input v-model="dataInfoForm.name"></el-input>
          </el-col>
        </el-form-item>
        <el-form-item label="人员数量">
          <el-col :span="11">
            <el-input v-model="dataInfoForm.employeesTotal"></el-input>
          </el-col>
        </el-form-item>
        <el-form-item label="时间区间">
          <el-col :span="11">
            <el-date-picker
              type="daterange"
              value-format="yyyy-MM-dd"
              v-model="dataInfoForm.timeArr"
              start-placeholder="开始时间"
              end-placeholder="结束时间"
              @input="updateDatepicker"
            >
            </el-date-picker>
          </el-col>
        </el-form-item>

        <el-form-item label="详细情况">
          <el-col :span="20">
            <VueTinymce
              id="tinymce"
              v-model="dataInfoForm.content"
              :setting="initTinymce"
            ></VueTinymce>
          </el-col>
        </el-form-item>
      </el-form>
      <div class="dataInfoFootDiv">
        <el-button @click="dataInfoDrawerVisible = false">取 消</el-button>
        <el-button type="primary" @click="dataInfoSubmit">保 存</el-button>
      </div>
    </el-drawer>
  </el-row>
</template>
<script>
import moment from "moment";
import { Message } from "element-ui";
import G6 from "@antv/g6";
import insertCss from "insert-css";

const { Util, TreeGraph, registerNode, Menu, Tooltip, Minimap } = G6;
let graph = {};
//节点类型颜色
const nodeType2Color = {
  0: "#F8FCFF",
  100: "#FFFFCC",
  200: "#CCFFFF",
  300: "#BCF2DA",
  400: "#CCFF99",
  500: "#FBD4D4",
  600: "#BBDAFB",
};
//根据节点状态颜色
const itemStatusColor = {
  0: "#5B8FF9",
  100: "#EEBC20",
  200: "#5BD8A6",
  300: "#F46649",
};
export default {
  name: "g6tree",
  data() {
    return {
      initTinymce: {
        language: "zh_CN", //语言
        height: 300, //编辑器高度
        branding: false, //是否禁用“Powered by TinyMCE”
        menubar: false, //顶部菜单栏显示
      },
      renameDialogVisible: false,
      delDialogVisible: false,
      dataInfoDrawerVisible: false,
      dataInfoForm: {
        id: "",
        name: "",
        employeesTotal: "",
        startTime: "",
        endTime: "",
        itemType: "",
        itemStatus: "",
        content: "",
      },
      itemStatusList: {
        0: "已保存",
        100: "已提交",
        200: "已审核",
        300: "审核未通过",
      },
      itemTypeList: {
        100: "项目准备工作相关",
        200: "项目程序制作",
        300: "项目测试相关",
        400: "硬件相关",
        500: "试运行",
        600: "项目验收相关",
      },
      dataInfo: [],
      selectLabelList: [],
      findLabeltimeout: false,
      lastSelectedNodeArr: [], // 上次选中节点
      itemNode: {}, // 右键菜单项 点击时的节点
      inputLabel: {
        name: "",
      },
      treeData: [],
      listData: [],
      searchParam: {
        searchLabel: "",
        searchItemStatus: "",
        radioTime: "",
        radioItemStatus: "",
      },
    };
  },
  created() {
    console.log(moment(), moment().format());
    //获取tree数据
    this.treeData = require("@/assets/treeData2.json");
    // 根据tree获取平级数组
    const treeData = JSON.parse(JSON.stringify(this.treeData));
    this.listData = this.treeToList(treeData);
    // select数据
    this.listData.forEach((item) => {
      this.selectLabelList.push({
        value: item.name,
        name: item.name,
        id: item.id,
      });
    });
    // progress 时间进度,算法根据根节点时间区间（今天的时间-开始时间）/（结束时间-开始时间）的天数
    let tStart = moment(this.listData[0].startTime);
    let tEnd = moment(this.listData[0].endTime);
    let tNow = moment();
    let dayTotal = tStart.diff(tEnd, "day");
    let dayNow = tStart.diff(dayNow, "day");
    this.progress = {
      percentage: parseInt((dayNow / dayTotal) * 100),
    };
    this.$nextTick(() => {
      this.treeInit();
    });
  },

  mounted() {},
  methods: {
    treeInit() {
      const that = this;
      that.styleCss(); // 样式函数
      // 创建G6右键菜单
      const menu = new Menu({
        itemTypes: ["node"],
        getContent(evt) {
          const model = evt.item.getModel();
          let menuHtml = `
            <div class="contextmenu__item" id="addLabel">新建标签</div>
            <div class="contextmenu__item" id="editLabel">重命名</div>
            <div class="contextmenu__item" id="delLabel">删除</div>
            <div class="contextmenu__item" id="detailLabel">详情</div>`;
          return menuHtml;
        },
        handleMenuClick(target, item) {
          if (target.id == "addLabel") {
            // 新建
            that.itemNode = item;
            Object.keys(that.dataInfoForm).forEach((key) => {
              that.dataInfoForm[key] = "";
            });
            that.dataInfoForm.startTime = moment().format("YYYY-MM-DD");
            that.dataInfoForm.endTime = moment().format("YYYY-MM-DD");
            that.dataInfoForm.timeArr = [
              that.dataInfoForm.startTime,
              that.dataInfoForm.endTime,
            ];
            that.dataInfoDrawerVisible = true;
          } else if (target.id == "editLabel") {
            // 重命名
            that.itemNode = item;
            that.renameDialog();
          } else if (target.id == "delLabel") {
            // 删除
            that.itemNode = item;
            this.delDialogVisible = true;
          } else if (target.id == "dataInfoLabel") {
          } else if (target.id == "detailLabel") {
            // 修改
            that.itemNode = item;
            that.dataInfoForm = that.itemNode.getModel();
            that.dataInfoForm.timeArr = [
              that.dataInfoForm.startTime,
              that.dataInfoForm.endTime,
            ];
            that.dataInfoForm.content = that.dataInfoForm.content.toString();
            that.dataInfoDrawerVisible = true;
          }
        },
      });
      //弹出层
      const tooltip = new Tooltip({
        getContent(e) {
          var tooltipHtml = "";
          const model = e.item.getModel();
          if (model.content && model.content.toString().length > 0) {
            tooltipHtml =
              `
              <div class="tooltip-header" >` +
              model.startTime +
              `一` +
              model.endTime +
              `（` +
              model.itemStatusName +
              `)</div>
              <div class="tooltip-content" ><h3>` +
              model.name +
              `</h3>` +
              model.content +
              `</div> `;
          }
          return tooltipHtml;
        },
        shouldBegin(e) {
          //设置条件，没有内容不显示tooltip
          const model = e.item.getModel();
          return model.content ? true : false;
        },
        itemTypes: ["node"],
        offsetX: 1,
        offsetY: 0,
        fixToNode: false,
        offset: 10,
      });
      // 实例化 minimap 插件
      const minimap = new Minimap({
        container: document.querySelector(".minimap"),
        size: [200, 200],
      });
      // G6增加自定义节点信息;
      registerNode(
        "rNode",
        {
          drawShape: (cfg, group) => {
            const {
              name,
              itemType,
              startTime,
              endTime,
              style,
              size,
              itemStatus,
              itemStatusName,
            } = cfg;
            const rect = group.addShape("rect", {
              attrs: {
                ...style,
                x: -size[0] / 2,
                y: -size[1] / 2,
                width: size[0],
                height: size[1],
                fill: nodeType2Color[itemType],
              },
              name: "rect",
            });
            // text time
            group.addShape("text", {
              attrs: {
                text: that.searchParam.radioTime
                  ? moment(startTime).format("YYYY-MM-DD") +
                    "一" +
                    moment(endTime).format("YYYY-MM-DD")
                  : "",
                x: -size[0] / 2,
                y: -size[1] / 2 - 15,
                opacity: 1,
                fill: "#999",
                textBaseline: "top",
              },
              name: "rect-shape-text1",
            });
            // text itemStatusName
            group.addShape("text", {
              attrs: {
                text: that.searchParam.radioItemStatus ? "(" + itemStatusName + ")" : "",
                x: size[0] / 2 - 70,
                y: size[1] / 2 - 46,
                opacity: 1,
                fill: itemStatusColor[itemStatus],
                textBaseline: "top",
              },
              name: "rect-shape-text2",
            });
            return rect;
          },
          update: (cfg, item) => {
            const { name, startTime, endTime, itemStatus, itemStatusName } = cfg;
            const group = item.getContainer();
            // 更新节点名
            const label = group.find((e) => e.get("name") === "text-shape");
            label.attr("text", this.formatLabel(name));
            // 更新时间
            const text1 = group.find((e) => e.get("name") === "rect-shape-text1");
            text1.attr(
              "text",
              that.searchParam.radioTime
                ? moment(startTime).format("YYYY-MM-DD") +
                    "一" +
                    moment(endTime).format("YYYY-MM-DD")
                : ""
            );
            // 更新状态及样式
            const text2 = group.find((e) => e.get("name") === "rect-shape-text2");
            text2.attr({
              text: that.searchParam.radioItemStatus ? "(" + itemStatusName + ")" : "",
              fill: itemStatusColor[itemStatus],
            });
          },
        },
        "rect"
      );

      const treeDiv = document.querySelector("#treeDiv");
      const width = treeDiv.scrollWidth;
      const height = treeDiv.scrollHeight || 800;

      graph = new TreeGraph({
        plugins: [menu, minimap, tooltip],
        container: "treeDiv",
        width,
        height,
        pixelRatio: 2,
        modes: {
          // 内置行为参考 https://antv-g6.gitee.io/zh/docs/manual/middle/states/defaultBehavior
          default: ["collapse-expand", "drag-canvas", "zoom-canvas", "drag-node"],
        },
        // 设置一些状态时节点变化
        nodeStateStyles: {
          mouseenter: {
            // 鼠标划入样式设置
            shadowColor: "#CCC",
            shadowBlur: 1,
          },
          clicked: {
            // 选中样式设置
            stroke: "#409EFF",
            lineWidth: 2,
            shadowColor: "#409EFF",
            shadowBlur: 10,
          },
        },
        // 节点类型及样式
        defaultNode: {
          size: [300, 30],
          type: "rNode",
          style: {
            // 节点阴影颜色和宽度
            shadowColor: "#CCC",
            shadowBlur: 20,
            // 阴影偏移量
            shadowOffsetX: 5,
            shadowOffsetY: 5,
            // 边框颜色和宽度
            stroke: "",
            lineWidth: 0,
          },
        },
        // 连线类型及样式
        defaultEdge: {
          type: "polyline",
          style: {
            // 节点阴影颜色和宽度
            shadowColor: "#CCC",
            shadowBlur: 10,
            // 阴影偏移量
            shadowOffsetX: 5,
            shadowOffsetY: 5,
            // 颜色和宽度
            stroke: "#999",
            lineWidth: 2,
          },
        },
        //布局和绘图类型
        layout: {
          type: "mindmap",
          direction: "LR",
          getHeight: function getHeight() {
            return 40;
          },
          getWidth: function getWidth() {
            return 200;
          },
          getVGap: function getVGap() {
            return 10;
          },
          getHGap: function getHGap() {
            return 80;
          },
        },
      });

      // 格式化tree数据
      Util.traverseTree(this.treeData, (item) => {
        //深度遍历
        // type在G6树结构有含义，表示节点形状,如果后端数据中有type需要重新定义
        // item.dataType = item.type
        // item.type = "rNode";
        // 获取itemStatusName
        Object.keys(that.itemStatusList).forEach(function (k) {
          if (k == item.itemStatus) {
            item.itemStatusName = that.itemStatusList[k];
          }
        });
        item.label = that.formatLabel(item.name);
      });
      graph.read(this.treeData);
      graph.fitView();

      if (typeof window !== "undefined")
        window.onresize = () => {
          this.$nextTick(() => {
            if (!graph || graph.get("destroyed")) return;
            if (!treeDiv || !treeDiv.scrollWidth || !treeDiv.scrollHeight) return;
            graph.changeSize(treeDiv.scrollWidth, treeDiv.scrollHeight);
            graph.render();
            graph.fitView();
          });
        };
      graph.on("node:click", function (event) {
        const { item } = event;
        const nodeModel = item.getModel();
        that.findNodesByModels([nodeModel]);
      });
      // 鼠标移入节点 node:mouseenter
      graph.on("node:mouseenter", (evt) => {
        const { item } = evt;
        graph.setItemState(item, "mouseenter", true);
        // // 获得当前鼠标操作的目标节点
        // const node = item;
        // // 获得目标节点的所有相关边
        // const edges = node.getEdges();
        // // 将所有相关边的 running 状态置为 true，此时将会触发自定义节点的 setState 函数
        // edges.forEach((edge) => graph.setItemState(edge, "running", true));
      });
      // 鼠标移出节点 node:mouseleave
      graph.on("node:mouseleave", (evt) => {
        const { item } = evt;
        graph.setItemState(item, "mouseenter", false);
        // // 获得当前鼠标操作的目标节点
        // const node = item;
        // // 获得目标节点的所有相关边
        // const edges = node.getEdges();
        // // 将所有相关边的 running 状态置为 false，此时将会触发自定义节点的 setState 函数
        // edges.forEach((edge) => graph.setItemState(edge, "running", false));
      });
    },
    //搜索相关
    getLabelList(queryString, cb) {
      var selectLabelList = this.selectLabelList;
      var results = queryString
        ? selectLabelList.filter(this.createStateFilter(queryString))
        : selectLabelList;

      clearTimeout(this.findLabeltimeout);
      this.findLabeltimeout = setTimeout(() => {
        cb(results);
      }, 100);
    },
    createStateFilter(queryString) {
      return (searchLabel) => {
        return searchLabel.value.toLowerCase().indexOf(queryString.toLowerCase()) != -1;
      };
    },
    handleSelect(item) {
      // 清空searchLabel
      this.searchParam.searchItemStatus = "";
      const node = graph.findById(item.id);
      graph.focusItem(node, true, {
        easing: "easeCubic",
        duration: 500,
      });
      graph.translate(0, -200);
      this.findNodesByModels([item]);
    },
    findNodesByModels(arr) {
      // 查询是否有被选中节点,并清除样式
      if (this.lastSelectedNodeArr) {
        this.lastSelectedNodeArr.map((val) => {
          graph.setItemState(val.id, "clicked", false);
        });
        this.lastSelectedNodeArr = [];
      }
      // arr为空，就不走下面选中逻辑了
      if (arr) {
        arr.map((item) => {
          let findobj = graph.findById(item.id);
          if (findobj) {
            // 保存选中节点
            this.lastSelectedNodeArr.push(findobj.getModel());
            // 修改选中节点样式
            graph.setItemState(item.id, "clicked", true);
          }
        });
      }
    },
    // 重置条件
    searchResetFn() {
      Object.keys(this.searchParam).forEach((key) => {
        this.searchParam[key] = "";
      });
      this.findNodesByModels();
    },
    searchFn() {
      // 清空searchLabel
      this.searchParam.searchLabel = "";
      //搜索状态fn
      let searchNodes = [];
      let searchNodeModels = [];
      //获取选中状态的所有节点
      searchNodes = graph.findAll("node", (node) => {
        return node.get("model").itemStatus == this.searchParam.searchItemStatus;
      });
      //获取选中状态的所有model
      searchNodes.forEach((item) => {
        searchNodeModels.push(item.get("model"));
      });
      this.findNodesByModels(searchNodeModels);
    },
    isShowTimeinfo() {
      graph.render();
      graph.fitView();
    },
    isShowItemStatus() {
      graph.render();
      graph.fitView();
    },
    renameDialog() {
      this.inputLabel.name = this.itemNode._cfg.model.name;
      this.renameDialogVisible = true;
    },
    dataInfoSubmit() {
      if (this.dataInfoForm.name == "") {
        Message.error("请输入名称");
        return;
      }
      //add 新建子节点
      if (!this.dataInfoForm.id) {
        this.dataInfoForm.id = `n-${Math.random()}`;
        this.dataInfoForm.label = this.formatLabel(this.dataInfoForm.name);
        this.dataInfoForm.itemType = this.itemNode._cfg.model.itemType;
        this.dataInfoForm.itemStatus = 0;
        this.dataInfoForm.itemStatusName = "已保存";

        const model = this.itemNode.getModel();
        if (!model.children) {
          model.children = [];
        }
        model.children.push(this.dataInfoForm);
        graph.updateChild(model, model.id);
      } else {
        //修改节点
        const model = this.itemNode.getModel();
        const originStyle = this.itemNode.get("originStyle");
        let updateModel = {
          ...model,
          ...this.dataInfoForm,
          itemStatus: 0,
          itemStatusName: "已保存",
          name: this.dataInfoForm.name,
        };
        const nodeItem = graph.findById(model.id);
        graph.updateItem(nodeItem, updateModel);
      }
      this.dataInfoDrawerVisible = false;
      Message.success("新建成功");
    },
    renameSubmit() {
      const model = this.itemNode.getModel();
      const updateModel = {
        ...model,
        name: this.inputLabel.name,
        label: this.formatLabel(this.inputLabel.name),
      };
      this.itemNode.update(updateModel);
      Message.success("修改成功");
      this.renameDialogVisible = false;
    },
    delSubmit() {
      this.delDialogVisible = false;
      const model = this.itemNode.getModel();
      if (model.depth != 0) {
        //根节点不能删除，这里写删除访问后台接口逻辑
        graph.removeChild(model.id);
        //停止缩进动画，不加就像收起节点一样，视觉显示错误
        graph.stopAnimate();
        Message.success("删除成功");
      }
    },
    updateDatepicker(arr) {
      //时间更新
      this.dataInfoForm = {
        ...this.dataInfoForm,
        startTime: arr[0],
        endTime: arr[1],
      };
    },
    downloadImage() {
      graph.downloadFullImage(Math.random().toString(16));
    },
    editDialogClose() {
      this.renameDialogVisible = false;
    },
    delDialogClose() {
      this.renameDialogVisible = false;
    },
    dataInfoClose() {
      this.dataInfoDrawerVisible = false;
    },
    //格式化label
    formatLabel(str) {
      return str.length > 20 ? str.substr(0, 20) + "..." : str;
    },
    /* tree转化平级数组 */
    treeToList(tree) {
      var queen = [];
      var out = [];
      queen = queen.concat(tree);
      while (queen.length) {
        var first = queen.shift();
        if (first.children) {
          queen = queen.concat(first.children);
          delete first["children"];
        }
        out.push(first);
      }
      return out;
    },
    back() {
      this.$router.go(-1);
    },
    // 浮框样式
    styleCss() {
      insertCss(`
        .g6-component-tooltip {
          max-width: 600px;
          max-height: 500px;
          overflow-y: auto;
          position: absolute;
          left: -150px;
          z-index: 5;
          border: 1px solid #e2e2e2;
          border-radius: 4px;
          font-size: 14px;
          color: #545454;
          background-color: rgba(255, 255, 255, 0.9);
          padding: 10px 8px;
          box-shadow: rgb(174, 174, 174) 0px 0px 10px;
          text-align: justify;
          text-justify: newspaper;
          word-break: break-all;
        }

      .contextmenu__item {
        display: block;
        line-height: 34px;
        text-align: center;
      }
      .contextmenu__item:not(:last-child) {
        border-bottom: 1px solid rgba(0, 0, 0, 0.1);
      }
      .g6-component-contextmenu {
        width: 150px;
      }
      .contextmenu__item:hover {
        cursor: pointer;
        background: #66b1ff;
        border-color: #66b1ff;
        color: #fff;
      }
      .tooltip-header{
        padding:5px;
        text-align: left;
        border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        font-size: 14px;
      }
      .tooltip-content{
        line-height:26px;
        font-size: 14px;
        padding:5px;
        text-align: left;
      }
    `);
    },
  },
};
</script>
<style rel="stylesheet/scss" lang="scss" scoped>
.minimap {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
  border: 1px solid #ddd;
  background-color: #fff;
}
.container {
  border: 1px solid #ddd;
  height: 100%;
  position: relative;
  overflow: auto;
  .top {
    display: flex;
    justify-content: space-between;
    width: 100%;
    height: 50px;
    background-color: white;
    padding: 0 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
    .cursor {
      cursor: pointer;
      font-size: 20px;
    }
    .el-button {
      min-width: 70px;
    }
  }
  .itemBox {
    background-color: white;
    padding: 15px;
    font-size: 14px;
    .form-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      ::v-deep {
        .el-form-item {
          padding-bottom: 10px !important;
        }
      }
    }
    span {
      color: rgba(0, 0, 0, 0.65);
    }
  }
  .dataInfoFootDiv {
    text-align: center;
    margin-bottom: 20px;
    ::v-deep {
      .el-button {
        width: 100px;
        margin-right: 30px;
      }
    }
  }
  .el-form-item {
    margin-bottom: 10px;
  }
  .flex-box {
    padding-bottom: 15px;
    border-bottom: 1px solid rgba(151, 151, 151, 0.35);
    .el-row {
      display: flex;
      align-items: center;
      margin-bottom: 15px;
    }
    .el-col {
      display: flex;
      align-items: center;
    }
    .label {
      margin-right: 5px;
    }
    .el-select,
    .el-input,
    .el-autocomplete,
    .el-date-editor {
      width: 80%;
    }
  }
  .canvaBox {
    height: 100%;
    position: relative;
  }
  .whr100 {
    width: 100%;
    height: 100%;
    position: relative;
  }
  .mt10 {
    margin-top: 10px;
  }
}
::v-deep {
  .dataInfo-drawer-dialog {
    :focus {
      outline: 0;
    }
    .el-drawer__header {
      border-bottom: 1px solid rgba(151, 151, 151, 0.35);
      padding-bottom: 10px;
      margin-bottom: 10px;
    }
    .el-drawer__body {
      padding: 0 5px;
    }
  }
  .el-progress-bar__outer,
  .el-progress-bar__inner {
    border-radius: 0;
  }
  .el-date-editor--daterange.el-input__inner {
    width: 394px;
  }
}
</style>
