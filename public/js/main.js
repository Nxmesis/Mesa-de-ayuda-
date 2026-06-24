// Confirmar antes de desactivar usuario
document.addEventListener('DOMContentLoaded', function() {
    const forms = document.querySelectorAll('form[action*="/desactivar"]');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            if (!confirm('Estas seguro de desactivar este usuario?')) {
                e.preventDefault();
            }
        });
    });
});

//Auto-cerrar alertas despues de 5 segundos
document.addEventListener('DOMContentLoaded', function() {
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(alert => {
        setTimeout(() => {
            alert.style.opacity = '0';
            alert.style.transition = 'opacity 0.3s';
            setTimeout(() => alert.remove(), 300);
        }, 5000);
    });
});

// main.js - solo auto-cerrar alertas
document.addEventListener('DOMContentLoaded', function() {
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(alert => {
        setTimeout(() => {
            alert.style.opacity = '0';
            alert.style.transition = 'opacity 0.3s';
            setTimeout(() => alert.remove(), 300);
        }, 5000);
    });
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(() => console.log('✅ App lista para offline'))
    .catch(err => console.log('SW error:', err));
}