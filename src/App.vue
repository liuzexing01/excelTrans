<template>
  <ImportExcel
    ref="importExcelRef"
    date-format="YYYY-MM-DD"
    @success="loadDataSuccess"
    :before-upload="beforeUpload"
  >
    <AButton type="primary">上传文件</AButton>
    <AButton type="primary" class="down" @click.stop="downloadErrorCode"
      >下载完整错误码</AButton
    >
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

    <a-tab-pane key="3" tab="未配置错误码树形结构图" force-render>
      <AButton
        type="primary"
        class="down"
        @click="downloadUnsetCode"
        v-if="unsetCode?.length"
      >
        下载未设置错误码
      </AButton>
      <a-tree
        class="tree"
        :tree-data="unsetCode"
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
import { onMounted, ref } from "vue";
import { message } from "ant-design-vue";
import { ImportExcel } from "@fed-material/ui-web";
import * as xlsx from "xlsx";
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
function loadDataSuccess(excelDataList: any[]) {
  if (excelDataList[0].results) {
    excelData.value = excelDataList[0].results.map((item: any) => {
      return {
        time: item["__time__"],
        errorName: item["error_name"],
        errorContent: item["error_content"],
        errorCode: item["error_code"],
        count: item["count"] || 0,
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
    if (!item.errorContent) return;
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
    barChart.setOption(option);
    barChart.resize();
  }, 0);
}

//设置树形列表process
const treeData = ref([]);
function setTreeList(list: any[]) {
  let treeList: any = {};
  list.forEach((item) => {
    if (!item.errorContent) return;
    if (!treeList[item.errorCode]) {
      treeList[item.errorCode] = {
        count: 0,
        name: "错误码：" + item.errorCode,
        code: item.errorCode,
        child: {},
      };
    }
    if (treeList[item.errorCode]) {
      if (item.count) {
        treeList[item.errorCode].count += item.count;
      } else {
        treeList[item.errorCode].count++;
      }
      let child = treeList[item.errorCode].child;
      if (child[item.errorContent]) {
        if (item.count) {
          child[item.errorContent].count += item.count;
        } else {
          child[item.errorContent].count++;
        }
      } else {
        child[item.errorContent] = {
          count: item.count,
          name: "错误内容：" + item.errorContent,
          content: item.errorContent,
          code: item.errorCode,
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
  getUnsetCode(treeData.value);
}

// 下载表格
async function downloadErrorCode() {
  if (!errorCode.value) return;
  let errorList = [];
  for (let key in errorCode) {
    let errorItem = errorCode.value[key];
    let item: any = {};
    item.code = key;
    errorItem.forEach((err: any) => {
      switch (true) {
        case err.tags.includes("default"):
          item.default = err.message;
          break;
        case err.tags.includes("bms"):
          item.bms = err.message;
          break;
        case err.tags.includes("cloud"):
          item.cloud = err.message;
          break;
        case err.tags.includes("business"):
          item.business = err.message;
          break;
        case err.tags.includes("appointment"):
          item.appointment = err.message;
          break;
        case err.tags.includes("laisi"):
          item.laisi = err.message;
          break;
      }
    });
    errorList.push(item);
  }
  downloadExcel(errorList);
}

function downloadExcel(list: any) {
  let ws = xlsx.utils.json_to_sheet(list); //通过工具将json转表对象
  // 创建 workbook
  const wb = xlsx.utils.book_new();
  // 生成xlsx文件(book,sheet数据,sheet命名)
  xlsx.utils.book_append_sheet(wb, ws, "sheet1");
  // 写文件(book,xlsx文件名称)
  xlsx.writeFile(wb, "错误码.xlsx");
}

const errorCode = ref();
function getErrorCode() {
  return new Promise(function (resolve, reject) {
    let xhr = new XMLHttpRequest();
    xhr.timeout = 10000;
    xhr.onload = function () {
      if (this.status >= 200 && this.status < 300) {
        resolve(this.response);
      } else {
        reject(false);
      }
    };
    xhr.onerror = function () {
      reject();
    };
    xhr.open("GET", "https://cdn.fed.hzmantu.com/error_code_build2.json");
    xhr.send();
  });
}
onMounted(async () => {
  let res = await getErrorCode();
  if (!res) return;
  errorCode.value = JSON.parse(res as string);
});

const unsetCode = ref();
function getUnsetCode(list: any) {
  unsetCode.value = list.filter((item: any) => {
    return !errorCode.value["0x" + item.code.toString(16)];
  });
}

function downloadUnsetCode() {
  let list: any[] = [];
  unsetCode.value.forEach((item: any) => {
    list = list.concat(Object.values(item.child));
  });
  let exportList = list.map((item) => {
    return {
      错误码: item.code,
      数量: item.count,
      错误内容: item.content,
    };
  });
  downloadExcel(exportList);
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
.down {
  margin-left: 10px;
}
</style>
