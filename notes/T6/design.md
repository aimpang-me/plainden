# T6 design

Two shapes were compared. One puts every preset in a table and hides ffmpeg behind `compressVideo`. The other switches on a preset name inside the page component.

The table won. Discord and WhatsApp carry a byte cap. 720p and 480p carry a height. The page calls one function. `gateVideo` owns the plan file-size check. `videoBitrate` owns the byte math. The ffmpeg session is one queue because the worker holds one instance.

The rejected shape would list the presets in the select and again in the component.
