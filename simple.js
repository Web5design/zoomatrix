var gl;

function log(a) {

  l = $('#log');
  l.html(l.html() + a + '<br>');

}

function clearLog() {

  l = $('#log');
  l.html('');

}

function glGrid(w, h) {
 
  this.colors = [];
  this.width = w;
  this.height = h;
  
}

var grid = new glGrid(30, 20);

function FpsTimer() {

  this.lastTs = 0;
  this.recent = Array();
  this.samples = 100;

};

FpsTimer.prototype.ts = function () {

  return (new Date()).getTime();

};

FpsTimer.prototype.fps = function () {

  newTs = this.ts();
  dt = newTs - this.lastTs;
  isFirst = !this.lastTs;
  this.lastTs = newTs;
  if (isFirst)
    return;
 
  f = 1000. / dt;
  if (f == Infinity) f = 0;
  var length = this.recent.unshift(f);

  if (length > this.samples) {
    this.recent.pop();
    length --;
  }

  var total = 0;
  $.each(this.recent, function(i, v) {
    total += v;
  });
  return parseInt(total / length);

}

FpsTimer.prototype.update = function () {

  $('#fps').html('FPS: ' + this.fps());

}

var fps = new FpsTimer();
fps.update();
 
function initGL(canvas) {
  try {
    gl = canvas.getContext("experimental-webgl");
    gl.viewport(0, 0, canvas.grid.width, canvas.grid.height);
  } catch(e) {
  }
  if (!gl) {
    alert("Could not initialise WebGL, sorry :-(");
  }
}


function getShader(gl, id) {
  var shaderScript = document.getElementById(id);
  if (!shaderScript) {
    return null;
  }

  var str = "";
  var k = shaderScript.firstChild;
  while (k) {
    if (k.nodeType == 3) {
      str += k.textContent;
    }
    k = k.nextSibling;
  }

  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }

  gl.shaderSource(shader, str);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  }

  return shader;
}


var shaderProgram;
function initShaders() {
  var fragmentShader = getShader(gl, "shader-fs");
  var vertexShader = getShader(gl, "shader-vs");

  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Could not initialise shaders");
  }

  gl.useProgram(shaderProgram);

  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
  gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);

  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
}


var mvMatrix;

function loadIdentity() {
  mvMatrix = Matrix.I(4);
}


function multMatrix(m) {
  mvMatrix = mvMatrix.x(m);
}


function mvTranslate(v) {
  var m = Matrix.Translation($V([v[0], v[1], v[2]])).ensure4x4();
  multMatrix(m);
}


var pMatrix;
function perspective(fovy, aspect, znear, zfar) {
  pMatrix = makePerspective(fovy, aspect, znear, zfar);
}


function setMatrixUniforms() {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, new WebGLFloatArray(pMatrix.flatten()));
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, new WebGLFloatArray(mvMatrix.flatten()));
}



var squareVertexPositionBuffer;
var squareVertexColorBuffer;


function initVertexBuffers() {

  squareVertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexPositionBuffer);
  v = [
       1.0,  1.0,  0.0,
      -1.0,  1.0,  0.0,
       1.0, -1.0,  0.0,
      -1.0, -1.0,  0.0,
       5.0,  5.0,  0.0,
  ];

  vertices = [];
  verts = 0;

  for (var x = 0; x < grid.width; x++) {

    for (var y = 0; y < grid.height; y++) {

      vertices = vertices.concat([

        x + 0, y + 0, 0,
        x + 1, y + 0, 0,
        x + 0, y + 1, 0,
        x + 1, y + 1, 0,
        x + 1, y + 1, 0,

      ]);
  
      verts += 5;

    }

  }


  gl.bufferData(gl.ARRAY_BUFFER, new WebGLFloatArray(vertices), gl.STATIC_DRAW);
  squareVertexPositionBuffer.itemSize = 3;
  squareVertexPositionBuffer.numItems = verts;

}

grid.colors = [];

function initColorBuffers() {

  squareVertexColorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexColorBuffer);
  grid.colors = []
  for (var i = 0; i < squareVertexPositionBuffer.numItems; i++) {
    grid.colors = grid.colors.concat([Math.random(), 0.5 + Math.random(), 1.0, 1.0]);
  }
  gl.bufferData(gl.ARRAY_BUFFER, new WebGLFloatArray(grid.colors), gl.DYNAMIC_DRAW);
  squareVertexColorBuffer.itemSize = 4;
  squareVertexColorBuffer.numItems = squareVertexPositionBuffer.numItems;

}

function updateColorBuffers() {

  for (var i = 0; i < grid.colors.length; i++) {

    grid.colors[i] = Math.random();

  }
  gl.bufferData(gl.ARRAY_BUFFER, new WebGLFloatArray(grid.colors), gl.DYNAMIC_DRAW);

}

function drawScene() {
  
  updateColorBuffers();
  
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  perspective(45, 1.0, 0.1, 100.0);
  loadIdentity();

  mvTranslate([-grid.width / 2, -grid.height / 2, -100.0]);

  gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexPositionBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, squareVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexColorBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, squareVertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);

  setMatrixUniforms();
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, squareVertexPositionBuffer.numItems);

  fps.update();

}



function webGLStart() {

  var canvas = document.getElementById("lesson01-canvas");
  initGL(canvas);
  initShaders();
  initVertexBuffers();
  initColorBuffers();

  gl.clearColor(0.5, 0.6, 0.5, 1.0);

  gl.clearDepth(1.0);

  gl.disable(gl.DEPTH_TEST);

  setInterval(drawScene, 0);

}

