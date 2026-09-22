/* Is there a camera this app is allowed to open?

   `getUserMedia` is missing entirely on an insecure origin (it needs https or
   localhost) and on browsers without it, so callers check this before
   offering a "take a photo" button — a button that can only fail is worse
   than no button. It says nothing about permission: that is a prompt the
   person answers when the camera actually opens, and CameraCapture handles
   the refusal itself. */
export function cameraSupported() {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
}
