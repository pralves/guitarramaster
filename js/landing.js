(function(){
  'use strict';

  const modal = document.getElementById('modal');
  const closeBtn = document.getElementById('modal-close');
  const leadForm = document.getElementById('lead-form');
  const modalTitle = document.getElementById('modal-title');
  const modalDescription = document.getElementById('modal-description');
  const sourceField = document.getElementById('lead-source');
  const signupTriggers = document.querySelectorAll('[data-signup-trigger]');

  if(!modal || !leadForm) return;

  const defaultTitle = modalTitle ? modalTitle.textContent : 'Quero ser um Guitarra Master';
  const defaultDescription = modalDescription ? modalDescription.textContent : '';

  function openModal(trigger){
    const title = trigger && trigger.dataset.signupTitle ? trigger.dataset.signupTitle : defaultTitle;
    const source = trigger && trigger.dataset.signupSource ? trigger.dataset.signupSource : 'cadastro-interessado';

    if(modalTitle) modalTitle.textContent = title;
    if(modalDescription) {
      modalDescription.textContent = source.includes('aulas') || source.includes('minicurso')
        ? 'Preencha seus dados para receber acesso às aulas gratuitas do Minicurso Starter.'
        : defaultDescription;
    }
    if(sourceField) sourceField.value = source;

    modal.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';

    const input = document.getElementById('lead-name') || modal.querySelector('input');
    if(input) input.focus();
  }

  function closeModal(){
    modal.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
  }

  signupTriggers.forEach(trigger => {
    trigger.addEventListener('click', function(e){
      e.preventDefault();
      openModal(trigger);
    });
  });

  if(closeBtn) closeBtn.addEventListener('click', closeModal);

  modal.addEventListener('click', function(e){
    if(e.target === modal) closeModal();
  });

  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') closeModal();
  });

  leadForm.addEventListener('submit', function(e){
    e.preventDefault();

    const submitBtn = leadForm.querySelector('button[type="submit"]');
    const formData = new FormData(leadForm);
    const lead = {
      name: String(formData.get('name') || '').trim(),
      phone: String(formData.get('phone') || '').trim(),
      email: String(formData.get('email') || '').trim(),
      state: String(formData.get('state') || '').trim(),
      instrument: String(formData.get('instrument') || '').trim(),
      source: String(formData.get('source') || 'cadastro-interessado').trim()
    };

    if(!lead.name || !lead.phone || !lead.email || !lead.state || !lead.instrument) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';

    fetch(leadForm.dataset.endpoint || '/api/leads', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(lead)
    }).then(async response => {
      if(!response.ok) throw new Error(await response.text());
      return response.json();
    }).then(() => {
      submitBtn.textContent = 'Cadastro enviado!';
      leadForm.reset();
      if(sourceField) sourceField.value = 'cadastro-interessado';

      setTimeout(() => {
        closeModal();
        submitBtn.disabled = false;
        submitBtn.textContent = 'Enviar cadastro';
      }, 1200);
    }).catch(err => {
      console.error('Lead error', err);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Tentar novamente';
    });
  });
})();
