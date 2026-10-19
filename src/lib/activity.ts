/** Whether a workout is running or paused right now. Background tasks (like an app update) must not interrupt it. */
let timerBusy = false;

export function setTimerBusy(busy: boolean) {
  timerBusy = busy;
}

export function isTimerBusy(): boolean {
  return timerBusy;
}
