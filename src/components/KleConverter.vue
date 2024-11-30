<script setup>
import { computed, reactive, ref } from "vue";
import FileSaver from "file-saver";
import JsonEditorVue from "json-editor-vue";
import * as kle from "@ijprest/kle-serial";
import KeyboardRender from "./KeyboardRender.vue";
import { createAjvValidator, ValidationSeverity } from "vanilla-jsoneditor";

const kleSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "array",
  items: {
    oneOf: [
      { /* metadata object, would be better to handle with 'prefixItems' but that would requires
           newer ajv with draft 2020. This does not check if this object is once at first position */
        type: "object",
        properties: {
          author: { type: "string" },
          backcolor: { type: "string", pattern: "^#[0-9a-f]{3}([0-9a-f]{3})?$" },
          background: {
            anyOf: [
              {
                type: "object",
                properties: {
                  name: { type: "string" },
                  style: { type: "string" },
                },
                additionalProperties: false,
              },
              { type: "null" },
            ],
          },
          name: { type: "string" },
          notes: { type: "string" },
          radii: { type: "string" },
          switchBrand: { type: "string" },
          switchMount: { type: "string" },
          switchType: { type: "string" },
        },
        additionalProperties: false,
      },
      {
        type: "array",
        items: {
          oneOf: [
            {
              type: "object",
              properties: {
                x: { type: "number" }, // coordinates
                y: { type: "number" },
                w: { type: "number" }, // dimensions
                h: { type: "number" },
                x2: { type: "number" }, // second coordinates
                y2: { type: "number" },
                w2: { type: "number" }, // second dimensions
                h2: { type: "number" },
                r: { type: "number" }, // rotation
                rx: { type: "number" },
                ry: { type: "number" },
                l: { type: "boolean" }, // 'stepped' key
                n: { type: "boolean" }, // 'homing' key
                d: { type: "boolean" }, // 'decal' key
                f: { type: "number" }, // primary font height
                f2: { type: "number" }, // secondary font height
                fa: { type: "array", items: { type: "number" } }, // alternative font height notation
                c: { type: "string", pattern: "^#[0-9a-f]{3}([0-9a-f]{3})?$" }, // color of keycap
                t: { type: "string" }, // color of text
                g: { type: "boolean" }, // 'ghosted' key
                a: { type: "number" }, // text alignment
                p: { type: "string" }, // profile
              },
              additionalProperties: false,
            },
            { type: "string" },
          ],
        },
      },
    ],
  },
};

const validate = createAjvValidator({ schema: kleSchema });

const editorsPanelRef = ref(null);
const jsonEditorRef = ref(null);

const layout = ref({
  json: [],
  text: undefined,
});

const keys = ref([]);
const keyboard = ref({
  json: undefined,
  text: JSON.stringify(kle.Serial.deserialize([]), null, 2),
});

const resize = reactive({
  isActive: false,
});

const styleEditorPanel = reactive({
  flexShrink: 1,
  flexBasis: "0%",
  overflowX: "scroll",
});

const styleLeftPanel = reactive({
  flexGrow: 0.7,
});

const styleRightPanel = computed(() => {
  return {
    flexGrow: 1 - styleLeftPanel.flexGrow,
  };
});

function showFailAlert(message) {
  alert(message);
}

function triggerUpload() {
  document.getElementById("file").click();
}

function resetKeyboard() {
  keyboard.value.text = "";
  keys.value = [];
}

function updateKeyboard(value) {
  value.keys.forEach((key) => {
    for (const prop in key) {
      if (typeof key[prop] === "number" && !isNaN(key[prop])) {
        key[prop] = parseFloat(key[prop].toFixed(6));
      }
    }
  });
  keyboard.value.text = JSON.stringify(value, null, 2);
  keys.value = value.keys;
}

function validateLayout(value) {
  const valid = validate(value);
  if (valid.length !== 0) {
    resetKeyboard();
    return valid;
  }

  let k = undefined;
  try {
    k = kle.Serial.deserialize(value);
  } catch (error) {
    resetKeyboard();
    // kle-serial does not return json-path in error,
    // use empty array to indicate that whole json if invalid
    return [{ path: [], message: error, severity: ValidationSeverity.error }];
  }

  if (k !== undefined) {
    updateKeyboard(k);
  }

  // no validation error
  return [];
}

function uploadLayout() {
  let file = document.getElementById("file").files[0];

  let reader = new FileReader();
  reader.readAsText(file, "UTF-8");
  reader.onload = (evt) => {
    if (file.type !== "application/json") {
      showFailAlert("Unsupported file type");
      return;
    }
    layout.value.json = JSON.parse(evt.target.result);
    layout.value.text = undefined;
  };

  reader.onerror = (evt) => {
    console.error(evt);
  };
}

function getConvertedLayout() {
  var blob = new Blob([keyboard.value.text], {
    type: "application/json;charset=utf-8",
  });
  FileSaver.saveAs(blob, "keyboard-layout-internal.json");
}

function resizeMove(event) {
  if (!resize.isActive) {
    return false;
  }
  event.preventDefault();

  let pointerRelativeXpos = event.clientX - editorsPanelRef.value.offsetLeft;
  styleLeftPanel.flexGrow =
    pointerRelativeXpos / editorsPanelRef.value.clientWidth;
}
</script>

<template>
  <div class="up">
    <div class="editors-panel" ref="editorsPanelRef">
      <div :style="[styleEditorPanel, styleLeftPanel]">
        <JsonEditorVue
          ref="jsonEditorRef"
          class="json-editor"
          :content="layout"
          :validator="validateLayout"
          :main-menu-bar="true"
          :status-bar="true"
        />
        <div>
          <span style="display: flex; gap: 10px">
            <button @click="triggerUpload">Upload JSON</button>
            <input
              type="file"
              id="file"
              ref="file"
              accept=".json"
              v-on:change="uploadLayout"
              style="display: none"
            />
          </span>
        </div>
      </div>
      <div
        class="center-panel"
        @mousemove="resizeMove"
        @mouseleave="resizeMove"
        @mousedown="
          (event) => {
            event.preventDefault();
            resize.isActive = true;
          }
        "
        @mouseup="
          (event) => {
            resize.isActive = false;
          }
        "
      />
      <div :style="[styleEditorPanel, styleRightPanel]">
        <JsonEditorVue
          class="json-editor"
          :content="keyboard"
          :onChange="
            (c) => {
              keyboard = c;
            }
          "
          :read-only="true"
          :main-menu-bar="true"
          :status-bar="true"
        />
        <div>
          <button @click="getConvertedLayout">Download</button>
        </div>
      </div>
    </div>
  </div>
  <div class="down">
    <KeyboardRender :keys="keys" />
  </div>
</template>

<style scoped>
.editors-panel {
  display: flex;
  box-sizing: border-box;
  min-width: 0;
  width: 100%;
}

.center-panel {
  width: 60px;
  cursor: col-resize;
}

.json-editor {
  height: 400px;
  min-height: 0;
  min-width: 0;
  margin-bottom: 5px;
}
</style>
