export default async function run(ctx) {
  const d = document.createElement('div');
  d.id = 'dark-overlay';
  d.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.6);
  z-index:999999;backdrop-filter:blur(2px)`;
  document.body.appendChild(d);
  d.onclick = () => d.remove();
}