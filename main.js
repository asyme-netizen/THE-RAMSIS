document.addEventListener('DOMContentLoaded', () => {
  const year = document.querySelector('[data-year]');
  if (year) year.textContent = new Date().getFullYear();

  document.querySelectorAll('[data-newsletter]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector('input[type="email"]');
      if (!input || !input.value.trim()) {
        alert('Please enter an email address.');
        return;
      }
      alert(`Thanks for subscribing to THE RAMSIS, ${input.value.trim()}!`);
      form.reset();
    });
  });
});
