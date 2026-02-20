<script setup lang="ts">
import { computed, h, ref, onMounted } from 'vue'
import { DataTableColumns, MenuOption, NButton, NSpace, NTag, useMessage } from 'naive-ui'
import { createI18n } from 'vue-i18n'
import { useI18n } from "vue-i18n";
import KeyTracker from './KeyTracker.vue';
import KeySelector from './KeySelector.vue';
import { storeToRefs } from 'pinia';
import { useMainStore } from '../store/main';
import { keyBindingModifierToString, keyCodeToKeyName, keyModifierToKeyName, keyCodeToString } from "../apis/utils";
import { Keycode } from 'emi-keyboard-controller';
import * as ekc from 'emi-keyboard-controller';
import * as apis from '../apis/api'
import Key from "./Key.vue";
import MarkdownRender from "./MarkdownRender.vue";

const { t } = useI18n();

const message = useMessage();

const dynamicKey = ref<ekc.IDynamicKey>();

const store = useMainStore();
const { readmeMarkdown } = storeToRefs(store);
</script>

<template>
  <div style="flex: 1; display: flex; height: 100%;">
    <n-scrollbar style="height: 100%;">
      <MarkdownRender :content="readmeMarkdown" />
    </n-scrollbar>
  </div>
</template>

<style></style>