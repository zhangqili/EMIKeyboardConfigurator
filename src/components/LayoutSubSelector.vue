<script setup lang="ts">
import { computed, reactive, ref, defineEmits } from "vue";
import Key from "./Key.vue";
import * as kle from "@ijprest/kle-serial";
import { KeyConfig } from "../apis/utils";

const props = defineProps(["labels","selectedIndex"]);

const emit = defineEmits<{
  (e: "update:selectedIndex", value: number): void;
}>();

function handleClick(index : number)
{  
    let next = 0;
    if (props.labels.length > 1) {
        
        next = index;
    }
    else
    {
        next = props.selectedIndex === index ? 0 : index;
    }
    emit("update:selectedIndex", next);
}

</script>

<template>
    <n-button-group vertical v-if="props.labels.length > 1">
        <n-button v-for="(value,index) in props.labels" :type="selectedIndex === (index as number) ? 'primary' : ''" @click="handleClick(index as number)">{{ value }}</n-button>
    </n-button-group>
    <n-button-group vertical v-if="props.labels.length == 1">
        <n-button v-for="(value,index) in props.labels" :type="selectedIndex === (index as number + 1) ? 'primary' : ''" @click="handleClick(index as number + 1)">{{ value }}</n-button>
    </n-button-group>
</template>

<style scoped>
</style>
