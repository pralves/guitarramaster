(function(){
  'use strict';

  const modal = document.getElementById('modal');
  const closeBtn = document.getElementById('modal-close');
  const leadForm = document.getElementById('lead-form');
  const modalTitle = document.getElementById('modal-title');
  const modalDescription = document.getElementById('modal-description');
  const sourceField = document.getElementById('lead-source');
  const countryField = document.getElementById('lead-country');
  const phoneField = document.getElementById('lead-phone');
  const leadFormMessage = document.getElementById('lead-form-message');
  const signupTriggers = document.querySelectorAll('[data-signup-trigger]');
  let currentPhoneCode = getSelectedPhoneCode();

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
    setFormMessage('');
    ensurePhoneCode();

    modal.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';

    const input = document.getElementById('lead-name') || modal.querySelector('input');
    if(input) input.focus();
  }

  function closeModal(){
    modal.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
  }

  function setFormMessage(message){
    if(!leadFormMessage) return;

    leadFormMessage.textContent = message || '';
    leadFormMessage.classList.toggle('hidden', !message);
  }

  function getSelectedPhoneCode(){
    if(!countryField) return '55';

    const selectedOption = countryField.options[countryField.selectedIndex];
    return selectedOption && selectedOption.dataset.phoneCode ? selectedOption.dataset.phoneCode : '55';
  }

  function getLocalPhoneDigits(value, phoneCode){
    const digits = String(value || '').replace(/\D/g, '');
    return digits.startsWith(phoneCode) ? digits.slice(phoneCode.length) : digits;
  }

  function formatPhone(value, phoneCode){
    const localDigits = getLocalPhoneDigits(value, phoneCode).slice(0, 14);

    if(phoneCode === '55') return formatBrazilPhone(localDigits);
    if(!localDigits) return `+${phoneCode}`;

    return `+${phoneCode} ${localDigits.replace(/(\d{1,3})(?=\d)/g, '$1 ').trim()}`;
  }

  function formatBrazilPhone(localDigits){
    const digits = String(localDigits || '').replace(/\D/g, '').slice(0, 11);
    const area = digits.slice(0, 2);
    const first = digits.slice(2, 7);
    const second = digits.slice(7, 11);

    if(!digits) return '+55';
    if(digits.length <= 2) return `+55 (${area}`;
    if(digits.length <= 7) return `+55 (${area}) ${first}`;
    return `+55 (${area}) ${first}-${second}`;
  }

  function ensurePhoneCode(){
    if(!phoneField || phoneField.value.trim()) return;

    currentPhoneCode = getSelectedPhoneCode();
    phoneField.value = formatPhone('', currentPhoneCode);
  }

  signupTriggers.forEach(trigger => {
    trigger.addEventListener('click', function(e){
      e.preventDefault();
      openModal(trigger);
    });
  });

  if(closeBtn) closeBtn.addEventListener('click', closeModal);

  if(countryField && phoneField) {
    countryField.addEventListener('change', function(){
      const nextPhoneCode = getSelectedPhoneCode();
      const localDigits = getLocalPhoneDigits(phoneField.value, currentPhoneCode);

      currentPhoneCode = nextPhoneCode;
      phoneField.placeholder = nextPhoneCode === '55' ? '+55 (00) 00000-0000' : `+${nextPhoneCode}`;
      phoneField.value = formatPhone(localDigits, nextPhoneCode);
      phoneField.focus();
    });
  }

  if(phoneField) {
    ensurePhoneCode();

    phoneField.addEventListener('focus', ensurePhoneCode);
    phoneField.addEventListener('input', function(){
      phoneField.value = formatPhone(phoneField.value, getSelectedPhoneCode());
    });
  }

  modal.addEventListener('click', function(e){
    if(e.target === modal) closeModal();
  });

  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') closeModal();
  });

  leadForm.addEventListener('submit', function(e){
    e.preventDefault();
    setFormMessage('');

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
    if(lead.phone.replace(/\D/g, '').length < 10) {
      setFormMessage('Informe um telefone valido.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';

    fetch(leadForm.dataset.endpoint || '/api/leads', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(lead)
    }).then(async response => {
      const data = await response.json().catch(() => ({}));
      if(!response.ok) throw new Error(data.error || 'Erro ao enviar cadastro');
      return data;
    }).then(() => {
      submitBtn.textContent = 'Cadastro enviado!';
      leadForm.reset();
      if(sourceField) sourceField.value = 'cadastro-interessado';
      if(countryField) currentPhoneCode = getSelectedPhoneCode();
      ensurePhoneCode();

      setTimeout(() => {
        closeModal();
        submitBtn.disabled = false;
        submitBtn.textContent = 'Enviar cadastro';
      }, 1200);
    }).catch(err => {
      console.error('Lead error', err);
      setFormMessage(err.message || 'Erro ao enviar cadastro. Tente novamente.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Tentar novamente';
    });
  });
})();
