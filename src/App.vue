<template>
  <ImportExcel
    ref="importExcelRef"
    date-format="YYYY-MM-DD"
    @success="loadDataSuccess"
    :before-upload="beforeUpload"
  >
    <AButton type="primary">上传文件</AButton>
  </ImportExcel>
  <a-tabs v-model:activeKey="activeKey" class="tab">
    <a-tab-pane key="1" tab="柱状图" force-render>
      <div id="barChart" :style="{ height: `${height}px` }"></div>
    </a-tab-pane>
    <a-tab-pane key="2" tab="树形结构图" force-render>
      <a-tree
        class="tree"
        :tree-data="treeData"
        :fieldNames="{ children: 'child', title: 'name', key: 'name' }"
      >
        <template #title="{ name, count }">
          {{ name }} ，数量{{ count }}</template
        >
      </a-tree>
    </a-tab-pane>
  </a-tabs>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import { message } from "ant-design-vue";
import { ImportExcel, ExcelData } from "@fed-material/ui-web";
import * as echarts from "echarts";
type EChartsOption = echarts.EChartsOption;

const activeKey = ref("1");
// 上传验证
const importExcelRef = ref();
function beforeUpload(file: File) {
  if (!file.name.includes(".xlsx") || !file.name.includes(".xls")) {
    message.error("文件格式错误");
    setTimeout(() => {
      importExcelRef.value.clear();
    });
    return false;
  }
}

// 文件解析回调
const excelData = ref();
function loadDataSuccess(excelDataList: ExcelData[]) {
  if (excelDataList[0].results) {
    excelData.value = excelDataList[0].results.map((item) => {
      return {
        time: item["__time__"],
        errorName: item["error_name"],
        errorContent: item["error_content"],
        errorCode: item["error_code"],
      };
    });
  }
  if (!excelData.value?.length) {
    message.error("数据为空");
    return;
  }

  setBarOption(excelData.value);
  setTreeList(excelData.value);
}

const height = ref();
// 设置柱状图
function setBarOption(list: any[]) {
  // 设置x/y轴数据
  let axis: any = {};
  list.forEach((item) => {
    if (axis[item.errorCode]) {
      axis[item.errorCode]++;
    } else {
      axis[item.errorCode] = 1;
    }
  });
  height.value = Object.keys(axis).length * 20;
  let option: EChartsOption = {
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "shadow",
      },
    },
    toolbox: {
      feature: {
        saveAsImage: {
          show: true,
        },
      },
    },
    xAxis: {
      type: "value",
    },
    yAxis: {
      type: "category",
      data: Object.keys(axis),
    },
    series: [
      {
        data: Object.values(axis),
        type: "bar",
        showBackground: true,
        label: {
          show: true,
          position: "right",
        },
        backgroundStyle: {
          color: "rgba(180, 180, 180, 0.2)",
        },
      },
    ],
  };
  setTimeout(() => {
    let chartDom = document.getElementById("barChart")!;
    let barChart = echarts.init(chartDom);
    option && barChart.setOption(option);
  }, 0);
}
const treeData = ref([]);
function setTreeList(list: any[]) {
  let treeList: any = {};
  list.forEach((item) => {
    if (!item.errorContent) return;
    if (!treeList[item.errorCode]) {
      treeList[item.errorCode] = {
        count: 0,
        name: "错误码：" + item.errorCode,
        child: {},
      };
    }
    if (treeList[item.errorCode]) {
      treeList[item.errorCode].count++;
      let child = treeList[item.errorCode].child;
      if (child[item.errorContent]) {
        child[item.errorContent].count++;
      } else {
        child[item.errorContent] = {
          count: 1,
          name: "错误内容：" + item.errorContent,
          time: item.time,
        };
      }
    }
  });
  treeData.value = Object.values(treeList);
  treeData.value.forEach((item: any) => {
    if (item.child) {
      item.child = Object.values(item.child).sort((a: any, b: any) => {
        return b.count - a.count;
      });
    }
  });
}
</script>

<style scoped lang="less">
#barChart {
  width: 100%;
}
.tree {
  width: 100%;
  height: 500px;
}
.tab {
  margin-top: 20px;
}
</style>
