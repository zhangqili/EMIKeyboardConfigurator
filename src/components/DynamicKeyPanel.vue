<script setup lang="ts">
import { ref } from 'vue'
import { NSpace } from 'naive-ui'
import { createI18n } from 'vue-i18n'
import { useI18n } from "vue-i18n";
import KeyboardTracker from './KeyboardTracker.vue';
import KeySelector from './KeySelector.vue';
import { storeToRefs } from 'pinia';
import { useMainStore } from '../store/main';
import { keyBindingModifierToString, keyCodeToKeyName, keyModifierToKeyName, keyCodeToString } from "../apis/utils";
import { KeyCode } from 'emi-keyboard-controller';

const { t } = useI18n();

const store = useMainStore();
const { key_binding, selected_layer, keymap, advanced_keys } = storeToRefs(store);

</script>
<template>

</template>

<style></style>