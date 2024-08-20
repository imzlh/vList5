<script lang="ts">
    export default {
        name: 'ObjTree',
        props: {
            obj: {
                type: Object,
                required: true
            },
            parent: {
                type: Object,
                default: null
            }
        },
        methods: {
            *renderObj() {
                for(const key in this.obj) try{
                    if(Object.prototype.hasOwnProperty.call(this.obj, key))
                        yield [Reflect.get(this.obj, key, this.parent || this.obj), key];
                }catch{
                    yield ['( ... )', key];
                }
            }
        },
        setup(props) {
            return {
                HTMLElement,
                obj: props.obj
            };
        }
    }
</script>

<template>
    <div class="obj-wrapper" v-for="[value, key] in renderObj()">
        <span class="key">{{ key }}</span>
        <span v-if="typeof value == 'function'">{{ value.name || 'anonymous' }}</span>
        <span v-else-if="typeof value == 'undefined'" style="color: gray">undefined</span>
        <span v-else-if="value === null" style="color: gray">null</span>
        <span v-else-if="Array.isArray(value)">Array[{{ value.length }}]</span>
        <span v-else-if="value instanceof Error">Error: {{ value.message }}</span>
        <span v-else-if="value instanceof HTMLElement">
            {{ value.tagName.toLowerCase() }}
            {{ value.id ? '#' + value.id : '' }}
            {{ value.classList.length > 0 ? '.' + Array.from(value.classList).join('.') : '' }}
        </span>
        <span v-else-if="typeof value == 'bigint'" num>{{ value }}</span>
        <span v-else-if="typeof value == 'number'" num>{{ value }}</span>
        <span v-else-if="typeof value == 'boolean'" :style="{color:  value ? 'green' : '#dabf34' }">
            {{ value ? 'true' : 'false' }}
        </span>
        <span v-else-if="typeof value == 'symbol'" obj>Symbol({{ value.description }})</span>
        <details v-else-if="typeof value == 'object'">
            <summary>{{ key }}</summary>
            <ObjTree :obj="value"></ObjTree>
        </details>
        <span v-else>{{ value }}</span>
    </div>
    <details v-if="obj.__proto__">
        <summary>[[ prototype ]]</summary>
        <ObjTree :obj="obj.__proto__" :parent="obj"></ObjTree>
    </details>
</template>
