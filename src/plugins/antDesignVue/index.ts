import type { App } from "vue";

// 暂时引入react 版本的css样式
// import 'ant-design-vue/dist/antd.variable.less'
// import '@/assets/design/antDesignUiTheme/style/themes/variable.less'

import "@fed-material/admin-design/es/antDesignUiTheme/index.less";
import "@fed-material/admin-design";

import Antd, { message } from "ant-design-vue";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";

dayjs.locale("zh-cn");

/**
 * @description 设置全局样式
 */
function setMessageConfig(mainDom: HTMLElement) {
  message.config({
    top: `80px`,
    getContainer: () => mainDom.querySelector("#app") || document.body,
  });
}

/**
 * @description 装载 antdesign ui
 * @param app
 */
export default function setupAntDesignUi(
  app: App<Element>,
  mainDom: HTMLElement
): void {
  setMessageConfig(mainDom);
  app.use(Antd);
}
