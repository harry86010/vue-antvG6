<template>
  <el-row :gutter="10" class="container">
    <el-col :span="2">
      <el-button type="" @click="downloadImage">导出</el-button>
    </el-col>
    <el-col :span="24">
      <div class="whr100" id="dataDiv"></div>
    </el-col>
  </el-row>
</template>
<script>
import G6 from "@antv/g6";
import insertCss from "insert-css";
insertCss(`
  .g6-tooltip {
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
var graph = {};
//根据节点状态颜色
const dataTypeColor = {
  100: "#EEBC20",
  200: "#5BD8A6",
  300: "#F46649",
};
export default {
  name: "g6dagre",
  data() {
    return {
      dagreData: [],
    };
  },
  created() {
    //获取json数据
    this.dagreData = require("@/assets/dagreData2.json");

    this.$nextTick(() => {
      this.init();
    });
  },
  methods: {
    init() {
      // 节点重定义
      G6.registerNode(
        "flow",
        {
          drawShape(cfg, group) {
            const rect = group.addShape("rect", {
              attrs: {
                x: -75,
                y: -25,
                width: 150,
                height: 50,
                radius: 5,
                stroke: "#5B8FF9",
                fill: dataTypeColor[cfg.dataType],
                lineWidth: 3,
              },
              name: "rect-shape",
            });
            if (cfg.name) {
              group.addShape("text", {
                attrs: {
                  text: cfg.name,
                  x: 0,
                  y: 0,
                  fill: "#00287E",
                  fontSize: 14,
                  textAlign: "center",
                  textBaseline: "middle",
                  fontWeight: "bold",
                },
                name: "text-shape",
              });
            }
            return rect;
          },
        },
        "single-node"
      );

      const container = document.getElementById("dataDiv");
      const width = container.scrollWidth;
      const height = container.scrollHeight || 900;
      graph = new G6.Graph({
        container: "dataDiv",
        width,
        height,
        defaultNode: {
          type: "flow",
        },
        defaultEdge: {
          type: "polyline",
          style: {
            radius: 5,
            endArrow: true,
            lineWidth: 2,
            stroke: "#C2C8D5",
          },
        },
        nodeStateStyles: {
          selected: {
            stroke: "#d9d9d9",
            fill: "#5394ef",
          },
        },
        modes: {
          default: [
            "drag-canvas",
            "zoom-canvas",
            "click-select",
            {
              type: "tooltip",
              formatText(model) {
                const cfg = model.conf;
                const text = [];
                cfg.forEach((row) => {
                  text.push(row.label + ":" + row.value + "<br>");
                });
                return text.join("\n");
              },
              offset: 10,
            },
          ],
        },
      });
      graph.read(this.dagreData);
      graph.fitView();

      if (typeof window !== "undefined")
        window.onresize = () => {
          if (!graph || graph.get("destroyed")) return;
          if (!container || !container.scrollWidth || !container.scrollHeight) return;
          graph.changeSize(container.scrollWidth, container.scrollHeight);
        };
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

