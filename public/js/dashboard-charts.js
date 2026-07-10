/* ============================================
   DASHBOARD CHARTS - Configuración de gráficos
   Colores específicos por categoría y prioridad
   ============================================ */

document.addEventListener('DOMContentLoaded', function() {

    // ── Gráfico de tendencia (línea) ─────────────────────────────────────
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
                    backgroundColor: 'rgba(46, 204, 113, 0.08)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#2ecc71',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#1a1f2e',
                        padding: 12,
                        cornerRadius: 8,
                        titleFont: { size: 13, weight: 'bold' },
                        bodyFont: { size: 12 }
                    }
                },
                scales: {
                    y: { 
                        beginAtZero: true, 
                        grid: { color: '#f0f2f5' },
                        ticks: { font: { size: 11 }, color: '#8b95a8' }
                    },
                    x: { 
                        grid: { display: false },
                        ticks: { font: { size: 11 }, color: '#8b95a8' }
                    }
                }
            }
        });
    }

    // ── Gráfico de estado (doughnut) ────────────────────────────────────
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
                        labels: { 
                            usePointStyle: true, 
                            padding: 15, 
                            font: { size: 11, weight: '500' },
                            color: '#4a5568'
                        }
                    },
                    tooltip: {
                        backgroundColor: '#1a1f2e',
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a,b) => a+b, 0);
                                const pct = total > 0 ? Math.round(context.raw * 100 / total) : 0;
                                return ` ${context.label}: ${context.raw} (${pct}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    // ── Gráfico de categoría (barras horizontales - colores específicos) ─
    const categoriaCanvas = document.getElementById('categoriaChart');
    if (categoriaCanvas) {
        const labels = JSON.parse(categoriaCanvas.dataset.labels || '[]');
        const valores = JSON.parse(categoriaCanvas.dataset.valores || '[]');
        const colores = JSON.parse(categoriaCanvas.dataset.colors || '[]');
        
        new Chart(categoriaCanvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Tickets',
                    data: valores,
                    backgroundColor: colores.length > 0 ? colores : '#2ecc71',
                    borderRadius: 6,
                    barThickness: 28
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: { 
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#1a1f2e',
                        padding: 12,
                        cornerRadius: 8
                    }
                },
                scales: {
                    x: { 
                        beginAtZero: true, 
                        grid: { color: '#f0f2f5' },
                        ticks: { font: { size: 11 }, color: '#8b95a8' }
                    },
                    y: { 
                        grid: { display: false },
                        ticks: { font: { size: 12, weight: '500' }, color: '#4a5568' }
                    }
                }
            }
        });
    }

    // ── Gráfico de prioridad (barras verticales - colores específicos) ───
    const prioridadCanvas = document.getElementById('prioridadChart');
    if (prioridadCanvas) {
        const labels = JSON.parse(prioridadCanvas.dataset.labels || '[]');
        const valores = JSON.parse(prioridadCanvas.dataset.valores || '[]');
        const colores = JSON.parse(prioridadCanvas.dataset.colors || '[]');
        
        new Chart(prioridadCanvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Tickets',
                    data: valores,
                    backgroundColor: colores.length > 0 ? colores : '#2ecc71',
                    borderRadius: 6,
                    barThickness: 40
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#1a1f2e',
                        padding: 12,
                        cornerRadius: 8
                    }
                },
                scales: {
                    y: { 
                        beginAtZero: true, 
                        grid: { color: '#f0f2f5' },
                        ticks: { font: { size: 11 }, color: '#8b95a8', stepSize: 1 }
                    },
                    x: { 
                        grid: { display: false },
                        ticks: { font: { size: 12, weight: '500' }, color: '#4a5568' }
                    }
                }
            }
        });
    }
});