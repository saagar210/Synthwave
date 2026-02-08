export class ShaderProgram {
  readonly program: WebGLProgram;
  private uniformCache: Map<string, WebGLUniformLocation> = new Map();

  constructor(
    private gl: WebGL2RenderingContext,
    vertexSource: string,
    fragmentSource: string,
  ) {
    const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentSource);

    const program = gl.createProgram();
    if (!program) throw new Error("Failed to create shader program");

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program) ?? "Unknown link error";
      gl.deleteProgram(program);
      throw new Error(`Shader program link failed: ${log}`);
    }

    // Shaders can be deleted after linking
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    this.program = program;
  }

  use(): void {
    this.gl.useProgram(this.program);
  }

  getUniform(name: string): WebGLUniformLocation {
    const cached = this.uniformCache.get(name);
    if (cached !== undefined) return cached;

    const location = this.gl.getUniformLocation(this.program, name);
    if (!location) throw new Error(`Uniform "${name}" not found in shader`);

    this.uniformCache.set(name, location);
    return location;
  }

  setFloat(name: string, value: number): void {
    this.gl.uniform1f(this.getUniform(name), value);
  }

  setVec2(name: string, x: number, y: number): void {
    this.gl.uniform2f(this.getUniform(name), x, y);
  }

  setVec3(name: string, x: number, y: number, z: number): void {
    this.gl.uniform3f(this.getUniform(name), x, y, z);
  }

  setVec4(name: string, x: number, y: number, z: number, w: number): void {
    this.gl.uniform4f(this.getUniform(name), x, y, z, w);
  }

  setInt(name: string, value: number): void {
    this.gl.uniform1i(this.getUniform(name), value);
  }

  dispose(): void {
    this.gl.deleteProgram(this.program);
    this.uniformCache.clear();
  }

  private compileShader(type: number, source: string): WebGLShader {
    const gl = this.gl;
    const shader = gl.createShader(type);
    if (!shader) throw new Error("Failed to create shader");

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader) ?? "Unknown compile error";
      const typeName = type === gl.VERTEX_SHADER ? "vertex" : "fragment";
      gl.deleteShader(shader);
      throw new Error(`${typeName} shader compile failed: ${log}`);
    }

    return shader;
  }
}
