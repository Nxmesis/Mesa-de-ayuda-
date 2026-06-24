document.addEventListener('DOMContentLoaded', function() {
    
    // Gráfico de tendencia
    const tendenciaCanvas = document.getElementById('tendenciaChart');
    if (tendenciaCanvas) {
        const dias = JSON.parse(tendenciaCanvas.dataset.dias || '["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"]');
        const valores = JSON.parse(tendenciaCanvas.dataset.valores || '[0,0,0,0,0,0,0]');
        
        new Chart(tendenciaCanvas.getContext('2d'), {
            type: 'line',
            data: {
                labels: dias,
                datasets: [{
                    label: 'Tickets creados',
                    data: valores,
                    borderColor: '#2ecc71',
                    backgroundColor: 'rgba(46, 204, 113, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#2ecc71',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: '#f0f2f5' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    // Gráfico de estado (doughnut)
    const estadoCanvas = document.getElementById('estadoChart');
    if (estadoCanvas) {
        const valores = JSON.parse(estadoCanvas.dataset.valores || '[0,0,0,0]');
        
        new Chart(estadoCanvas.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Pendientes', 'En Proceso', 'Solucionados', 'Cerrados'],
                datasets: [{
                    data: valores,
                    backgroundColor: ['#f39c12', '#3498db', '#2ecc71', '#718096'],
                    borderWidth: 0,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: { 
                        position: 'bottom',
                        labels: { usePointStyle: true, padding: 15, font: { size: 11 } }
                    }
                }
            }
        });
    }

    // Gráfico de categoría
    const categoriaCanvas = document.getElementById('categoriaChart');
    if (categoriaCanvas) {
        const labels = JSON.parse(categoriaCanvas.dataset.labels || '[]');
        const valores = JSON.parse(categoriaCanvas.dataset.valores || '[]');
        
        new Chart(categoriaCanvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Tickets',
                    data: valores,
                    backgroundColor: '#2ecc71',
                    borderRadius: 6,
                    barThickness: 30
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: { legend: { display: false } },
                scales: {
                    x: { beginAtZero: true, grid: { color: '#f0f2f5' } },
                    y: { grid: { display: false } }
                }
            }
        });
    }

    // Gráfico de prioridad
    const prioridadCanvas = document.getElementById('prioridadChart');
    if (prioridadCanvas) {
        const labels = JSON.parse(prioridadCanvas.dataset.labels || '[]');
        const valores = JSON.parse(prioridadCanvas.dataset.valores || '[]');
        
        new Chart(prioridadCanvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Tickets',
                    data: valores,
                    backgroundColor: ['#2ecc71', '#f39c12', '#e74c3c', '#9b59b6'],
                    borderRadius: 6,
                    barThickness: 40
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: '#f0f2f5' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }
});