// src/wasm/mqjs_wasm.d.ts

export interface MqjsModule {
  // 虚拟文件系统 API
  FS: {
    writeFile(path: string, data: string | Uint8Array): void;
    readFile(path: string, opts?: { encoding: 'binary' }): Uint8Array;
    readFile(path: string, opts: { encoding: 'utf8' }): string;
    unlink(path: string): void;
  };
  
  // 调用 C 语言的 main 函数
  callMain(args: string[]): void;

  // 如果后续导出其他函数，可以继续加
  // _malloc(size: number): number;
  // _free(ptr: number): void;
}

// 定义初始化配置参数的接口
export interface MqjsModuleConfig {
  locateFile?: (path: string, scriptDirectory: string) => string;
  print?: (text: string) => void;
  printErr?: (text: string) => void;
  arguments?: string[];
  [key: string]: any;
}

// 声明默认导出的工厂函数
declare function createMqjsCompiler(config?: MqjsModuleConfig): Promise<MqjsModule>;

export default createMqjsCompiler;