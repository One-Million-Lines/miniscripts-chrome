export default async function run(ctx) {
 document.querySelectorAll('*:hover').forEach(el => {
    el.style.boxShadow = '0 0 0 3px orange';
    el.style.background = '#fff';
  });
}

