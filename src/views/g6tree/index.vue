<template>
  <el-row :gutter="10" class="container">
    <el-col :span="2">
      <el-button type="" @click="downloadImage">导出</el-button>
    </el-col>
    <el-col :span="24">
      <div class="whr100" id="treeDiv"></div>
    </el-col>
  </el-row>
</template>
<script>
import G6 from "@antv/g6";
import insertCss from "insert-css";
var graph = {};
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
    padding: 20px 20px;
    box-shadow: rgb(174, 174, 174) 0px 0px 10px;
    text-align: justify;
    text-justify: newspaper;
    word-break: break-all;
  }
  .tooltip-header{
    font-size:16px;
  }
`);
export default {
  name: "g6tree",
  data() {
    return {
      treeData: {},
    };
  },
  created() {
    //获取tree数据
    this.treeData = require("@/assets/treeData3.json");

    this.$nextTick(() => {
      this.treeInit();
    });
  },
  methods: {
    treeInit() {
      const that = this;
      //弹出层
      const tooltip = new G6.Tooltip({
        getContent(e) {
          var tooltipHtml = "";
          const model = e.item.getModel();

          tooltipHtml =
            `
              <div class="tooltip-header" >` +
            model.label +
            `</div>
              <div class="tooltip-content" ><h3>` +
            model.conf[0].label +
            ":" +
            model.conf[0].value +
            `</h3>` +
            `</div> `;

          return tooltipHtml;
        },

        itemTypes: ["node"],
        offsetX: 1,
        offsetY: 0,
        fixToNode: false,
        offset: 10,
      });

      // G6增加自定义节点信息;
      G6.registerNode(
        "rNode",
        {
          drawShape: (cfg, group) => {
            const { style, size } = cfg;
            const rect = group.addShape("rect", {
              attrs: {
                ...style,
                x: -size[0] / 2,
                y: -size[1] / 2,
                width: size[0],
                height: size[1],
                fill: "#91d5ff",
              },
              name: "rect",
            });
            return rect;
          },
        },
        "rect"
      );
      const defaultEdgeStyle = {
        stroke: "#91d5ff",
        // 箭头
        // endArrow: {
        //   path: "M 0,0 L 12, 6 L 9,0 L 12, -6 Z",
        //   fill: "#91d5ff",
        //   d: -20,
        // },
      };
      G6.registerEdge("flow-line", {
        draw(cfg, group) {
          const startPoint = cfg.startPoint;
          const endPoint = cfg.endPoint;

          const { style } = cfg;
          const shape = group.addShape("path", {
            attrs: {
              stroke: style.stroke,
              endArrow: style.endArrow,
              path: [
                ["M", startPoint.x, startPoint.y],
                ["L", startPoint.x, (startPoint.y + endPoint.y) / 2],
                ["L", endPoint.x, (startPoint.y + endPoint.y) / 2],
                ["L", endPoint.x, endPoint.y],
              ],
            },
          });

          return shape;
        },
      });
      const treeDiv = document.querySelector("#treeDiv");
      const width = treeDiv.scrollWidth;
      const height = treeDiv.scrollHeight || 800;

      graph = new G6.TreeGraph({
        plugins: [tooltip],
        container: "treeDiv",
        linkCenter: true,
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
            shadowBlur: 1,
          },
        },
        // 节点类型及样式
        defaultNode: {
          size: [150, 30],
          type: "rNode",
          style: {
            // 节点阴影颜色和宽度
            shadowColor: "#CCC",
            shadowBlur: 10,
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
          type: "flow-line",
          style: defaultEdgeStyle,
        },

        //布局和绘图类型
        layout: {
          type: "compactBox",
          direction: "TB",
          getHeight: function getHeight() {
            return 16;
          },
          getWidth: function getWidth() {
            return 16;
          },
          getVGap: function getVGap() {
            return 40;
          },
          getHGap: function getHGap() {
            return 70;
          },
        },
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
    downloadImage() {
      graph.downloadFullImage(Math.random().toString(16));
    },
  },
};
</script>
<style rel="stylesheet/scss" lang="scss" scoped>
.whr100 {
  height: 100%;
  width: 100%;
  position: relative;
}
</style>
