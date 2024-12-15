const aspectW = 16;
const aspectH = 9;
const container = document.body.querySelector('.container-canvas');

let canvas;
const { Engine, Bodies, Composite, Mouse, MouseConstraint, Vector, Body } =
  Matter;
let engine,
  world,
  circles = [];
let mouseConstraint;
let fieldRadius = 200; // 에너지 필드 반경
const initialFieldRadius = 200; // 초기 반경
const minFieldRadius = 50; // 최소 반경
const numCircles = 300;
const gravity = 0.0005; // 중력의 세기
const baseAttractionForce = 0.001; // 기본 끌림 강도
const maxAttractionForce = 0.03; // 최대 끌림 강도
const maxScatterForce = 0.05; // 흩어지는 최대 힘
let scatterForce = 0.01; // 초기 흩어지는 힘
let currentAttractionForce = baseAttractionForce; // 현재 끌림 강도
let isMousePressed = false; // 마우스 눌림 상태
let yellowRadius = 0; // 노란색 범위
let flashScreen = false; // 화면 깜빡임 상태
let pressStartTime = 0; // 마우스 누름 시작 시간
let pressDuration = 0; // 마우스 눌린 시간

function setup() {
  const { width: containerW, height: containerH } =
    container.getBoundingClientRect();

  if (aspectW === 0 || aspectH === 0) {
    canvas = createCanvas(containerW, containerH);
    canvas.parent(container);
  } else if (containerW / containerH > aspectW / aspectH) {
    canvas = createCanvas((containerH * aspectW) / aspectH, containerH);
    canvas.parent(container);
  } else {
    canvas = createCanvas(containerW, (containerW * aspectH) / aspectW);
    canvas.parent(container);
  }
  init();

  // 새로운 원을 주기적으로 추가
  setInterval(() => {
    const x = random(width);
    const radius = random(5, 10);
    const circle = Bodies.circle(x, -radius, radius, {
      restitution: 0.8,
      frictionAir: 0.02,
    });
    circle.color = color(150, 230, 255, 180);
    circles.push(circle);
    Composite.add(world, circle);
  }, 100); // 0.1초마다 새로운 원 생성
}

function init() {
  engine = Engine.create();
  world = engine.world;

  engine.world.gravity.y = 0;

  const mouse = Mouse.create(canvas.elt);
  mouse.pixelRatio = pixelDensity();
  mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: {
      stiffness: 0.1,
      render: {
        visible: false,
      },
    },
  });
  Composite.add(world, mouseConstraint);

  for (let i = 0; i < numCircles; i++) {
    const x = random(width);
    const y = random(height / 2);
    const radius = random(5, 10);
    const circle = Bodies.circle(x, y, radius, {
      restitution: 0.8,
      frictionAir: 0.02,
    });
    circle.color = color(150, 230, 255, 180);
    circles.push(circle);
    Composite.add(world, circle);
  }
}

function draw() {
  for (let y = 0; y < height; y++) {
    const gradient = map(y, 0, height, 50, 15);
    stroke(gradient, gradient * 1.2, gradient * 2);
    line(0, y, width, y);
  }

  if (flashScreen) {
    fill(40, 60, 90, 150);
    rect(0, 0, width, height);
    flashScreen = false;
  }

  Engine.update(engine);

  const mousePosition = mouseConstraint.mouse.position;

  if (isMousePressed) {
    pressDuration = millis() - pressStartTime; // 눌린 시간 계산
    currentAttractionForce = min(
      currentAttractionForce + 0.00003,
      maxAttractionForce
    );
    fieldRadius = max(fieldRadius - 0.5, minFieldRadius);
    yellowRadius = min(yellowRadius + 2, initialFieldRadius);
  } else {
    pressDuration = 0; // 초기화
    currentAttractionForce = baseAttractionForce;
    fieldRadius = lerp(fieldRadius, initialFieldRadius, 0.1);
    yellowRadius = 0;
  }

  circles.forEach((circle) => {
    const gravityForce = Vector.create(0, gravity * circle.mass);
    Body.applyForce(circle, circle.position, gravityForce);

    if (isMousePressed) {
      const distance = dist(
        circle.position.x,
        circle.position.y,
        mousePosition.x,
        mousePosition.y
      );
      if (distance < fieldRadius) {
        const forceDirection = Vector.sub(mousePosition, circle.position);
        const normalizedForce = Vector.normalise(forceDirection);
        const force = Vector.mult(normalizedForce, currentAttractionForce);

        Body.applyForce(circle, circle.position, force);

        if (distance < yellowRadius) {
          const yellowFactor = map(distance, 0, yellowRadius, 255, 150);
          circle.color = color(255, yellowFactor, 100, 200);
        }
      }
    }

    circle.color = lerpColor(circle.color, color(150, 230, 255, 180), 0.01);

    if (circle.position.y > height + circle.circleRadius) {
      Body.setPosition(
        circle,
        Vector.create(random(width), -circle.circleRadius)
      );
    }
  });

  noStroke();
  circles.forEach((circle) => {
    fill(circle.color);
    ellipse(circle.position.x, circle.position.y, circle.circleRadius * 2);
  });

  noFill();
  stroke(255, 100, 100, 150);
  ellipse(mousePosition.x, mousePosition.y, fieldRadius * 2);
}

function mousePressed() {
  isMousePressed = true;
  pressStartTime = millis(); // 누르기 시작한 시간 기록
}

function mouseReleased() {
  isMousePressed = false;
  flashScreen = true;

  // 흩어지는 속도 계산 (눌린 시간에 비례)
  const releaseForce = map(pressDuration, 0, 3000, 0.01, maxScatterForce);
  scatterForce = constrain(releaseForce, 0.01, maxScatterForce); // 최대치 제한

  const mousePosition = mouseConstraint.mouse.position;

  circles.forEach((circle) => {
    const distance = dist(
      circle.position.x,
      circle.position.y,
      mousePosition.x,
      mousePosition.y
    );
    if (distance < fieldRadius) {
      const scatterDirection = Vector.sub(circle.position, mousePosition);
      const normalizedForce = Vector.normalise(scatterDirection);
      const force = Vector.mult(normalizedForce, scatterForce);
      Body.applyForce(circle, circle.position, force);
    }
  });
}

function windowResized() {
  const { width: containerW, height: containerH } =
    container.getBoundingClientRect();
  if (aspectW === 0 || aspectH === 0) {
    resizeCanvas(containerW, containerH);
  } else if (containerW / containerH > aspectW / aspectH) {
    resizeCanvas((containerH * aspectW) / aspectH, containerH);
  } else {
    resizeCanvas(containerW, (containerW * aspectH) / aspectW);
  }
}
