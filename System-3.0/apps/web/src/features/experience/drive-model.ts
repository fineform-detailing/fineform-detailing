export type DriveAction = 'accelerate' | 'reverse' | 'left' | 'right' | 'brake';
export type DriveInput = Record<DriveAction, boolean>;
export type DriveState = { x: number; z: number; yaw: number; speed: number; distance: number; steer: number };
export const emptyDriveInput = (): DriveInput => ({ accelerate: false, reverse: false, left: false, right: false, brake: false });
export const initialDriveState = (): DriveState => ({ x: 0, z: 0, yaw: 0, speed: 0, distance: 0, steer: 0 });
export const keyAction = (code: string): DriveAction | undefined => ({ ArrowUp: 'accelerate', KeyW: 'accelerate', ArrowDown: 'reverse', KeyS: 'reverse', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', Space: 'brake' } as Record<string, DriveAction>)[code];
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
/** Low-speed bicycle model, in metres/seconds. No score, traffic, or timer. */
export function stepDrive(s: DriveState, input: DriveInput, elapsed: number): DriveState {
  const dt = clamp(Number.isFinite(elapsed) ? elapsed : 0, 0, .05);
  let speed = s.speed;
  if (input.brake || (input.accelerate && input.reverse)) speed = Math.sign(speed) * Math.max(0, Math.abs(speed) - 15 * dt);
  else if (input.accelerate) speed += (speed < 0 ? 12 : 5.4) * dt;
  else if (input.reverse) speed -= (speed > 0 ? 12 : 3.2) * dt;
  else speed = Math.sign(speed) * Math.max(0, Math.abs(speed) - (1.25 + Math.abs(speed) * .11) * dt);
  speed = clamp(speed, -4, 13.9);
  const target = (Number(input.left) - Number(input.right)) * .48;
  const steer = s.steer + (target - s.steer) * Math.min(1, dt * 10);
  const yaw = s.yaw + speed / 2.6 * Math.tan(steer) * dt;
  let x = s.x + Math.sin(yaw) * speed * dt, z = s.z + Math.cos(yaw) * speed * dt;
  if (Math.abs(x) > 37 || Math.abs(z) > 37) { x = clamp(x, -37, 37); z = clamp(z, -37, 37); speed = 0; }
  return { x, z, yaw, speed, steer, distance: s.distance + Math.hypot(x - s.x, z - s.z) };
}
