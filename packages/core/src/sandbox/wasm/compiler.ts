export class WasmCompiler {
  async compile(module: BufferSource): Promise<WebAssembly.Module> {
    return WebAssembly.compile(module);
  }

  async validate(module: BufferSource): Promise<boolean> {
    try {
      await this.compile(module);
      return true;
    } catch {
      return false;
    }
  }
}
