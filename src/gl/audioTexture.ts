export class AudioTexture {
  readonly texture: WebGLTexture;
  private size: number;

  constructor(
    private gl: WebGL2RenderingContext,
    size: number,
    private textureUnit: number,
  ) {
    this.size = size;
    const tex = gl.createTexture();
    if (!tex) throw new Error("Failed to create audio texture");
    this.texture = tex;

    gl.activeTexture(gl.TEXTURE0 + textureUnit);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    // Allocate R32F texture
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.R32F,
      size,
      1,
      0,
      gl.RED,
      gl.FLOAT,
      null,
    );

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  update(data: Float32Array): void {
    const gl = this.gl;
    const len = Math.min(data.length, this.size);
    gl.activeTexture(gl.TEXTURE0 + this.textureUnit);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, len, 1, gl.RED, gl.FLOAT, data);
  }

  bind(): void {
    this.gl.activeTexture(this.gl.TEXTURE0 + this.textureUnit);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
  }

  get unit(): number {
    return this.textureUnit;
  }

  dispose(): void {
    this.gl.deleteTexture(this.texture);
  }
}
