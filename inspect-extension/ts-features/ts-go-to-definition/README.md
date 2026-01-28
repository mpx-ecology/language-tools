# Go to Definition 测试用例

本目录包含用于测试"跳转到定义"功能的测试用例。

## 测试场景

### 1. 组件属性跳转到 properties/props 定义

#### Options API 子组件 (`child-component.mpx`)

| 父组件属性    | 预期跳转目标                    |
| ------------- | ------------------------------- |
| `title`       | `properties.title`              |
| `count`       | `properties.count`              |
| `show-header` | `properties.showHeader`         |
| `list-data`   | `properties.listData`           |
| `config`      | `properties.config`             |
| `name`        | `properties.name` (简写形式)    |
| `age`         | `properties.age` (简写形式)     |
| `visible`     | `properties.visible` (简写形式) |

子组件中方法可能定义在不同位置：

| 父组件事件绑定的方法        | 子组件中定义位置     | 预期跳转目标                    |
| --------------------------- | -------------------- | ------------------------------- |
| `onMethodsHandler`          | methods 中           | `methods.onMethodsHandler`      |
| `onTopLevelHandler`         | 顶层（和 data 同级） | `onTopLevelHandler()`           |
| `onTopLevelHandlerWithArgs` | 顶层（和 data 同级） | `onTopLevelHandlerWithArgs()`   |
| `onTopLevelArrowHandler`    | 顶层（箭头函数）     | `onTopLevelArrowHandler: () =>` |

#### Composition API 子组件 - 泛型写法 (`child-component-setup.mpx`)

| 父组件属性 | 预期跳转目标                         |
| ---------- | ------------------------------------ |
| `message`  | `defineProps<{ message: string }>`   |
| `visible`  | `defineProps<{ visible: boolean }>`  |
| `items`    | `defineProps<{ items: string[] }>`   |
| `optional` | `defineProps<{ optional?: string }>` |
| `config`   | `defineProps<{ config?: {...} }>`    |

#### Composition API 子组件 - 对象写法 (`child-component-setup-object.mpx`)

| 父组件属性 | 预期跳转目标                        |
| ---------- | ----------------------------------- |
| `msg`      | `defineProps({ msg: String })`      |
| `count`    | `defineProps({ count: Number })`    |
| `enabled`  | `defineProps({ enabled: Boolean })` |

#### withDefaults 子组件 (`child-component-with-defaults.mpx`)

| 父组件属性 | 预期跳转目标           |
| ---------- | ---------------------- |
| `title`    | `Props.title` 类型定义 |
| `count`    | `Props.count` 类型定义 |
| `theme`    | `Props.theme` 类型定义 |

### 2. 事件方法跳转

#### 支持的事件绑定语法

| 语法                | 示例                          | 说明                  |
| ------------------- | ----------------------------- | --------------------- |
| `bindxxx`           | `bindtap="handler"`           | 绑定事件              |
| `bind:xxx`          | `bind:tap="handler"`          | 绑定事件（带冒号）    |
| `catchxxx`          | `catchtap="handler"`          | 捕获事件，阻止冒泡    |
| `catch:xxx`         | `catch:tap="handler"`         | 捕获事件（带冒号）    |
| `capture-bind:xxx`  | `capture-bind:tap="handler"`  | 捕获阶段绑定          |
| `capture-catch:xxx` | `capture-catch:tap="handler"` | 捕获阶段捕获          |
| `mut-bind:xxx`      | `mut-bind:tap="handler"`      | 互斥事件绑定 (2.8.2+) |
| 动态绑定            | `bindtap="{{ handlerName }}"` | 方法名是变量          |

#### Options API 父组件 (`parent-component.mpx`)

点击事件处理方法名，应跳转到对应的定义位置：

| 模板中的方法           | 定义位置     | 预期跳转目标                                  |
| ---------------------- | ------------ | --------------------------------------------- |
| `onChildChange`        | methods      | `methods.onChildChange`                       |
| `handleViewTap`        | methods      | `methods.handleViewTap`                       |
| `handleLongPress`      | methods      | `methods.handleLongPress`                     |
| `inputBlur`            | methods      | `methods.inputBlur`                           |
| `handleImageLoad`      | methods      | `methods.handleImageLoad`                     |
| `setupHandler`         | setup 返回值 | `setup() { return { setupHandler } }`         |
| `setupHandlerWithArgs` | setup 返回值 | `setup() { return { setupHandlerWithArgs } }` |
| `dataHandler`          | data         | `data.dataHandler`                            |
| `computedHandler`      | computed     | `computed.computedHandler`                    |

#### Composition API 父组件 (`parent-component-setup.mpx`)

点击事件处理方法名，应跳转到 `<script setup>` 中对应的函数定义：

| 模板中的方法    | 预期跳转目标                |
| --------------- | --------------------------- |
| `onChildChange` | `const onChildChange = ...` |
| `handleViewTap` | `const handleViewTap = ...` |
| `inputBlur`     | `const inputBlur = ...`     |

### 3. 特殊场景

#### 带参数的事件处理

```html
<view bindtap="handleTapWithArgs('arg1', $event)"></view>
```

点击 `handleTapWithArgs` 应跳转到方法定义。

#### 内联箭头函数

```html
<view bindtap="{{ () => inlineHandler() }}"></view>
```

点击 `inlineHandler` 应跳转到方法定义。

#### 属性名转换 (kebab-case -> camelCase)

```html
<child-component show-header="{{ value }}" />
```

点击 `show-header` 应跳转到子组件的 `properties.showHeader` 定义。

## 文件说明

| 文件                                | 说明                                           |
| ----------------------------------- | ---------------------------------------------- |
| `child-component.mpx`               | Options API 子组件，包含 properties 和 methods |
| `child-component-setup.mpx`         | Composition API 子组件，使用泛型 defineProps   |
| `child-component-setup-object.mpx`  | Composition API 子组件，使用对象 defineProps   |
| `child-component-with-defaults.mpx` | Composition API 子组件，使用 withDefaults      |
| `parent-component.mpx`              | Options API 父组件 (createComponent)           |
| `parent-component-setup.mpx`        | Composition API 父组件                         |
| `parent-page.mpx`                   | Options API 页面 (createPage)                  |
| `parent-page-setup.mpx`             | Composition API 页面                           |

## 页面 vs 组件

### 页面 (createPage)

页面使用 `createPage` 创建，有以下特点：

- 页面生命周期方法直接定义在顶层：`onLoad`, `onShow`, `onHide`, `onUnload` 等
- 自定义方法也可以定义在顶层（和生命周期同级）
- 也可以在 `methods` 中定义方法
- 可以有 `properties` 接收页面参数

### 组件 (createComponent)

组件使用 `createComponent` 创建，有以下特点：

- 组件生命周期在 `lifetimes` 中定义
- 方法通常在 `methods` 中定义
- 也支持顶层定义方法（小程序原生写法）

## 如何测试

1. 在 VSCode 中打开 `parent-component.mpx` 或 `parent-component-setup.mpx`
2. 按住 `Ctrl` (Windows/Linux) 或 `Cmd` (macOS) 并点击属性名或方法名
3. 验证是否跳转到正确的定义位置
