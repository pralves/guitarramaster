(function(){
  'use strict';

  const modal = document.getElementById('modal');
  const openBtn = document.getElementById('open-modal');
  const closeBtn = document.getElementById('modal-close');
  const leadForm = document.getElementById('lead-form');

  if(!modal || !leadForm) return;

  function openModal(){
    modal.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
    const input = modal.querySelector('input[type="email"]');
    if(input) input.focus();
  }

  function closeModal(){
    modal.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
  }

  if(openBtn) openBtn.addEventListener('click', openModal);
  if(closeBtn) closeBtn.addEventListener('click', closeModal);

  modal.addEventListener('click', function(e){
    if(e.target === modal) closeModal();
  });

  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') closeModal();
  });

  leadForm.addEventListener('submit', function(e){
    e.preventDefault();

    const emailField = document.getElementById('lead-email');
    const email = emailField ? emailField.value.trim() : '';
    if(!email) return;

    const submitBtn = leadForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';

    fetch('/api/lead', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({email: email, source: 'minicurso-landing'})
    }).then(() => {
      submitBtn.textContent = 'Acesso enviado!';
      setTimeout(() => {
        closeModal();
        submitBtn.disabled = false;
        submitBtn.textContent = 'Quero as Aulas Grátis';
        leadForm.reset();
      }, 1200);
    }).catch(err => {
      console.error('Lead error', err);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Tentar novamente';
    });
  });

  const ctaPrimary = document.getElementById('cta-primary');
  if(ctaPrimary){
    ctaPrimary.addEventListener('click', function(e){
      e.preventDefault();
      const target = document.querySelector('#preco');
      if(target) target.scrollIntoView({behavior:'smooth'});
      else window.location.hash = '#preco';
    });
  }
})();
