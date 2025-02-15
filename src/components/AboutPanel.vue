<script setup lang="ts">
import { computed, h, ref } from 'vue'
import { DataTableColumns, MenuOption, NButton, NSpace, NTag, useMessage } from 'naive-ui'
import { createI18n } from 'vue-i18n'
import { useI18n } from "vue-i18n";
import KeyboardTracker from './KeyboardTracker.vue';
import KeySelector from './KeySelector.vue';
import { storeToRefs } from 'pinia';
import { useMainStore } from '../store/main';
import { keyBindingModifierToString, keyCodeToKeyName, keyModifierToKeyName, keyCodeToString } from "../apis/utils";
import { KeyCode } from 'emi-keyboard-controller';
import * as ekc from 'emi-keyboard-controller';
import Key from "./Key.vue";

const { t } = useI18n();

const message = useMessage();

const dynamic_key = ref<ekc.IDynamicKey>();

const store = useMainStore();
const { key_binding, current_layer, keymap, advanced_keys } = storeToRefs(store);

</script>

<template>
  <n-card title="About" style="height: 100%;">
    <n-a href="https://github.com/zhangqili/EMIKeyboardConfigurator">View source on Github</n-a>
  </n-card>
</template>

<style></style>