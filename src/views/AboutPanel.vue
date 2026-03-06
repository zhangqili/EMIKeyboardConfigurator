<script setup lang="ts">
import { useMessage } from 'naive-ui'
import { useI18n } from "vue-i18n";
import MarkdownRender from "@/components/MarkdownRender.vue";

const { t } = useI18n();
const message = useMessage();

const props = defineProps<{
  readmeMarkdown: string;
}>();

</script>

<template>
  <div style="flex: 1; display: flex; height: 100%;">
    <n-scrollbar style="height: 100%;">
      <MarkdownRender :content="props.readmeMarkdown" />
    </n-scrollbar>
  </div>
</template>

<style></style>