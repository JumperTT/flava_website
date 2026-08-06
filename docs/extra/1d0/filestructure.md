\### flava extra 1.0帮助文档 文件结构

\-----

flava的拓展系统使用.flave后缀名（或任意后缀名）的zip压缩包作为单个拓展，目录结构如下



```text
extra.flave
|
|--scripts        //储存所有lua脚本，以源码储存，flava自己会编译
|--ui             //储存所有ui文件
|--manifest.json  //储存拓展信息

```
其中manifest.json的格式如下：

```json
{
    "name":"拓展名称",
    "author":"作者",
    "version":"版本",
    "extra\_loader\_version":"适用的加载器版本",
    "new\_window":true,                           //是否需要新建新的DearImGui窗口
    "ui\_file":{                                  //所有ui文件的位置
    "插入点名称":"ui文件名称（需要后缀名）"
    }
}

```
其中ui\_file的插入点名称有两种，第一种是新的窗口，在new\_window项设置，恒定为new\_window，每个拓展只能申请一个，第二种是插入点，你可以打开flava的开发者调试查看
设置ui\_file的插入点以及对应的文件可以在插入点的位置插入ui

