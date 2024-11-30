document.addEventListener('DOMContentLoaded', function() {
    // Load Chart.js
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    document.head.appendChild(script);

    // Get all required elements
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const calculateBtn = document.getElementById('calculate-btn');
    const totalInvestment = document.getElementById('total-investment');
    const expectedReturns = document.getElementById('expected-returns');
    const totalValue = document.getElementById('total-value');
    const inflationAdjustedValue = document.getElementById('inflation-adjusted-value');
    const requiredSip = document.getElementById('required-sip');
    const wealthRatio = document.getElementById('wealth-ratio');
    let investmentChart = null;

    // Tab switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`${btn.dataset.tab}-tab`).classList.add('active');
        });
    });

    // Format currency
    function formatCurrency(amount) {
        return '₹' + amount.toLocaleString('en-IN');
    }

    // Validate input
    function validateInput(input, min, max) {
        let value = parseFloat(input.value);
        if (isNaN(value) || value < min || (max && value > max)) {
            input.style.borderColor = '#e74c3c';
            return false;
        }
        input.style.borderColor = '#e1e1e1';
        return true;
    }

    // Calculate basic SIP returns
    function calculateBasicSIP() {
        const monthlyInvestment = parseFloat(document.getElementById('monthly-investment').value);
        const years = parseFloat(document.getElementById('investment-period').value);
        const returnRate = parseFloat(document.getElementById('expected-return').value);
        const inflationRate = parseFloat(document.getElementById('inflation-rate').value);

        const monthlyRate = returnRate / 100 / 12;
        const months = years * 12;
        const totalInvestmentAmount = monthlyInvestment * months;

        const futureValue = monthlyInvestment * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate);
        const totalReturns = futureValue - totalInvestmentAmount;

        // Calculate inflation-adjusted value
        const realReturnRate = (1 + returnRate/100) / (1 + inflationRate/100) - 1;
        const monthlyRealRate = realReturnRate / 12;
        const inflationAdjustedFV = monthlyInvestment * ((Math.pow(1 + monthlyRealRate, months) - 1) / monthlyRealRate) * (1 + monthlyRealRate);

        return {
            investment: totalInvestmentAmount,
            returns: totalReturns,
            total: futureValue,
            inflationAdjusted: inflationAdjustedFV,
            wealthRatio: futureValue / totalInvestmentAmount
        };
    }

    // Calculate step-up SIP returns
    function calculateStepUpSIP() {
        const initialInvestment = parseFloat(document.getElementById('step-up-amount').value);
        const years = parseFloat(document.getElementById('step-up-period').value);
        const returnRate = parseFloat(document.getElementById('step-up-return').value);
        const annualIncrease = parseFloat(document.getElementById('annual-increase').value);

        const monthlyRate = returnRate / 100 / 12;
        let totalInvestment = 0;
        let futureValue = 0;
        let yearlyInvestment = initialInvestment;

        for (let year = 0; year < years; year++) {
            const yearlyFV = yearlyInvestment * ((Math.pow(1 + monthlyRate, 12) - 1) / monthlyRate) * (1 + monthlyRate);
            futureValue = (futureValue * (1 + returnRate/100)) + yearlyFV;
            totalInvestment += yearlyInvestment * 12;
            yearlyInvestment *= (1 + annualIncrease/100);
        }

        return {
            investment: totalInvestment,
            returns: futureValue - totalInvestment,
            total: futureValue,
            inflationAdjusted: futureValue,
            wealthRatio: futureValue / totalInvestment
        };
    }

    // Calculate goal-based SIP
    function calculateGoalSIP() {
        const targetAmount = parseFloat(document.getElementById('target-amount').value);
        const years = parseFloat(document.getElementById('goal-period').value);
        const returnRate = parseFloat(document.getElementById('goal-return').value);
        const inflationRate = parseFloat(document.getElementById('goal-inflation').value);

        const monthlyRate = returnRate / 100 / 12;
        const months = years * 12;
        
        // Adjust target for inflation
        const inflationAdjustedTarget = targetAmount * Math.pow(1 + inflationRate/100, years);
        
        // Calculate required monthly SIP
        const requiredMonthly = (inflationAdjustedTarget * monthlyRate) / 
            ((Math.pow(1 + monthlyRate, months) - 1) * (1 + monthlyRate));

        const totalInvestment = requiredMonthly * months;
        
        return {
            investment: totalInvestment,
            returns: inflationAdjustedTarget - totalInvestment,
            total: inflationAdjustedTarget,
            inflationAdjusted: targetAmount,
            wealthRatio: inflationAdjustedTarget / totalInvestment,
            requiredSIP: requiredMonthly
        };
    }

    // Create or update chart
    function updateChart(yearlyData) {
        const ctx = document.getElementById('investment-chart').getContext('2d');
        
        if (investmentChart) {
            investmentChart.destroy();
        }

        investmentChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: yearlyData.labels,
                datasets: [{
                    label: 'Investment',
                    data: yearlyData.investment,
                    borderColor: '#2c3e50',
                    backgroundColor: 'rgba(44, 62, 80, 0.1)',
                    fill: true
                }, {
                    label: 'Returns',
                    data: yearlyData.returns,
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Investment Growth Over Time'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: value => '₹' + (value/1000).toFixed(0) + 'K'
                        }
                    }
                }
            }
        });
    }

    // Generate yearly data for chart
    function generateYearlyData(results, years) {
        const labels = Array.from({length: years + 1}, (_, i) => `Year ${i}`);
        const investment = Array(years + 1).fill(0);
        const returns = Array(years + 1).fill(0);

        for (let i = 0; i <= years; i++) {
            investment[i] = (results.investment / years) * i;
            returns[i] = (results.total / years) * i;
        }

        return { labels, investment, returns };
    }

    // Animate value changes
    function animateValue(element, finalValue) {
        const duration = 1000;
        const steps = 20;
        const stepDuration = duration / steps;
        
        let currentValue = parseFloat(element.textContent.replace(/[₹,x]/g, '')) || 0;
        const stepValue = (finalValue - currentValue) / steps;

        let step = 0;
        const interval = setInterval(() => {
            currentValue += stepValue;
            if (element.id === 'wealth-ratio') {
                element.textContent = currentValue.toFixed(2) + 'x';
            } else {
                element.textContent = formatCurrency(Math.round(currentValue));
            }
            
            step++;
            if (step >= steps) {
                clearInterval(interval);
                if (element.id === 'wealth-ratio') {
                    element.textContent = finalValue.toFixed(2) + 'x';
                } else {
                    element.textContent = formatCurrency(Math.round(finalValue));
                }
            }
        }, stepDuration);
    }

    // Calculate and update results
    function calculateResults() {
        const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
        let results;

        switch(activeTab) {
            case 'basic':
                results = calculateBasicSIP();
                break;
            case 'step-up':
                results = calculateStepUpSIP();
                break;
            case 'goal':
                results = calculateGoalSIP();
                break;
        }

        // Update results
        animateValue(totalInvestment, results.investment);
        animateValue(expectedReturns, results.returns);
        animateValue(totalValue, results.total);
        animateValue(inflationAdjustedValue, results.inflationAdjusted);
        animateValue(wealthRatio, results.wealthRatio);

        if (results.requiredSIP) {
            animateValue(requiredSip, results.requiredSIP);
        }

        // Update chart
        const years = parseFloat(document.querySelector(`#${activeTab}-tab [id$=period]`).value);
        updateChart(generateYearlyData(results, years));
    }

    // Add event listeners
    calculateBtn.addEventListener('click', calculateResults);

    // Add input validation
    document.querySelectorAll('input[type="number"]').forEach(input => {
        input.addEventListener('blur', () => {
            const min = parseFloat(input.getAttribute('min'));
            const max = parseFloat(input.getAttribute('max'));
            validateInput(input, min, max);
        });
    });

    // Initialize with default calculation
    calculateResults();
});
