// public/js/dashboard-mantenimientos.js

(function() {
    'use strict';

    // Esperar a que el DOM esté listo
    function initCharts() {
        const data = window.CHART_DATA;

        if (!data) {
            console.error('Dashboard: No hay datos para las gráficas (window.CHART_DATA no definido)');
            showEmptyState('chart-por-mes', 'No hay datos disponibles');
            showEmptyState('chart-tipo', 'No hay datos disponibles');
            showEmptyState('chart-equipos', 'No hay datos disponibles');
            return;
        }

        console.log('Dashboard: Inicializando gráficas con datos:', data);

        // Verificar que Chart esté disponible
        if (typeof Chart === 'undefined') {
            console.error('Dashboard: Chart.js no está cargado');
            return;
        }

        // ── Gráfica: Mantenimientos por mes ─────────────────────────────
        initChartPorMes(data);

        // ── Gráfica: Preventivos vs Correctivos ─────────────────────────
        initChartTipo(data);

        // ── Gráfica: Top equipos con más mantenimientos ─────────────────
        initChartEquipos(data);
    }

    function showEmptyState(canvasId, message) {
        const canvas = document.getElementById(canvasId);
        if (canvas && canvas.parentElement) {
            canvas.parentElement.innerHTML = 
                '<p style="text-align:center; color:#a0aec0; padding:40px;">' + message + '</p>';
        }
    }

    function initChartPorMes(data) {
        const ctx = document.getElementById('chart-por-mes');
        if (!ctx) {
            console.warn('Dashboard: Canvas chart-por-mes no encontrado');
            return;
        }

        const porMes = data.porMes || [];

        if (porMes.length === 0) {
            showEmptyState('chart-por-mes', 'No hay datos disponibles');
            return;
        }

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: porMes.map(d => d.mes),
                datasets: [{
                    label: 'Mantenimientos',
                    data: porMes.map(d => d.count),
                    backgroundColor: '#2ecc71',
                    borderRadius: 6,
                    borderSkipped: false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1, font: { size: 11 } },
                        grid: { color: 'rgba(0,0,0,0.05)' }
                    },
                    x: {
                        ticks: { font: { size: 11 } },
                        grid: { display: false }
                    }
                }
            }
        });
        console.log('Dashboard: Gráfica por mes inicializada');
    }

    function initChartTipo(data) {
        const ctx = document.getElementById('chart-tipo');
        if (!ctx) {
            console.warn('Dashboard: Canvas chart-tipo no encontrado');
            return;
        }

        const tipo = data.tipo || { preventivos: 0, correctivos: 0 };
        const preventivos = tipo.preventivos || 0;
        const correctivos = tipo.correctivos || 0;

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Preventivos', 'Correctivos'],
                datasets: [{
                    data: [preventivos, correctivos],
                    backgroundColor: ['#3498db', '#e74c3c'],
                    borderWidth: 2,
                    borderColor: '#ffffff',
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { padding: 16, font: { size: 12 }, usePointStyle: true }
                    }
                }
            }
        });
        console.log('Dashboard: Gráfica tipo inicializada');
    }

    function initChartEquipos(data) {
        const ctx = document.getElementById('chart-equipos');
        if (!ctx) {
            console.warn('Dashboard: Canvas chart-equipos no encontrado');
            return;
        }

        const equipos = data.equipos || [];

        if (equipos.length === 0) {
            showEmptyState('chart-equipos', 'No hay datos disponibles');
            return;
        }

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: equipos.map(e => e.nombre),
                datasets: [{
                    label: 'Total mantenimientos',
                    data: equipos.map(e => e.count),
                    backgroundColor: '#9b59b6',
                    borderRadius: 6,
                    borderSkipped: false,
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: { stepSize: 1, font: { size: 11 } },
                        grid: { color: 'rgba(0,0,0,0.05)' }
                    },
                    y: {
                        ticks: { font: { size: 11 } },
                        grid: { display: false }
                    }
                }
            }
        });
        console.log('Dashboard: Gráfica equipos inicializada');
    }

    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCharts);
    } else {
        initCharts();
    }
})();