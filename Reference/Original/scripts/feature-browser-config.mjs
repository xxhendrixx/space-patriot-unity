// Keep validation usable on NVIDIA/AMD PCs and other operating systems.
// Leaving ANGLE unspecified lets Chromium choose the platform's normal backend.
export function launchOptions(software=false) {
  const backend=software?'swiftshader':process.env.SP_ANGLE_BACKEND||(process.platform==='win32'?'d3d11':null);
  if(backend&&!['d3d11','gl','vulkan','metal','swiftshader'].includes(backend))throw Error('Unsupported SP_ANGLE_BACKEND');
  return {headless:true,args:backend?['--use-gl=angle',`--use-angle=${backend}`,...(backend==='swiftshader'?['--enable-unsafe-swiftshader']:[])]:[]};
}
