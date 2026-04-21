import { IJsonModel } from "flexlayout-react";
import type { Messages } from "./i18n";

// component id → i18n key 映射
const TAB_NAMES: Record<string, keyof Messages> = {
  "3d-viewer": "viewer3d",
  "waveform": "waveform",
  "euler": "eulerAngles",
  "quaternion": "quaternion",
  "angular-velocity": "angularVelocity",
};

// 固定的英文 tab 名作为兜底
const TAB_FALLBACK: Record<string, string> = {
  "3d-viewer": "3D Viewer",
  "waveform": "Waveform",
  "euler": "Euler Angles",
  "quaternion": "Quaternion",
  "angular-velocity": "Angular Velocity",
};

export function tabName(component: string, lang: Messages): string {
  const key = TAB_NAMES[component];
  if (key && lang[key]) return lang[key];
  return TAB_FALLBACK[component] || component;
}

export function createLayout(lang: Messages): IJsonModel {
  const n = (c: string) => tabName(c, lang);
  return {
    global: {
      tabEnableClose: false,
      tabEnableRename: false,
      tabEnableDrag: false,
      tabSetEnableMaximize: true,
      tabSetEnableDrop: false,
      tabSetEnableDrag: false,
      tabSetMinWidth: 120,
      tabSetMinHeight: 80,
      borderEnableDrop: false,
      splitterSize: 5,
      splitterExtra: 4,
    },
    borders: [],
    layout: {
      type: "row",
      weight: 100,
      children: [
        {
          type: "row",
          weight: 65,
          children: [
            {
              type: "tabset",
              weight: 70,
              children: [
                { type: "tab", name: n("3d-viewer"), component: "3d-viewer" },
              ],
            },
            {
              type: "tabset",
              weight: 30,
              children: [
                { type: "tab", name: n("waveform"), component: "waveform" },
              ],
            },
          ],
        },
        {
          type: "row",
          weight: 35,
          children: [
            {
              type: "tabset",
              weight: 34,
              children: [
                { type: "tab", name: n("euler"), component: "euler" },
              ],
            },
            {
              type: "tabset",
              weight: 33,
              children: [
                { type: "tab", name: n("quaternion"), component: "quaternion" },
              ],
            },
            {
              type: "tabset",
              weight: 33,
              children: [
                { type: "tab", name: n("angular-velocity"), component: "angular-velocity" },
              ],
            },
          ],
        },
      ],
    },
  };
}
