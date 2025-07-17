let fiisDataHome = {}; // Variável para armazenar os dados dos FIIs para a home e comparador

        // Função para carregar os dados do JSON (necessário para o comparador)
        async function loadFiisData() {
            try {
                const response = await fetch('./fiis_data.json');
                fiisDataHome = await response.json();
            } catch (error) {
                console.error('Erro ao carregar os dados dos FIIs para o comparador:', error);
            }
        }
        // Função para escolher entre numero de cotas ou valor total
        function toggleInvestimentoInputs() {
            const tipo = document.getElementById('tipoInvestimento').value;
            document.getElementById('inputValorMensal').style.display = tipo === 'valor' ? 'block' : 'none';
            document.getElementById('inputNumeroCotas').style.display = tipo === 'cotas' ? 'block' : 'none';
        }

        // --- Funções para o Simulador ---
        let currentSimulatedFii = null; // Armazena o FII selecionado no simulador

        function updateSimulatorFiiData() {
            const tickerInput = document.getElementById('simuladorFiiTicker');
            const ticker = tickerInput.value.trim().toUpperCase();
            const rendimentoElem = document.getElementById('simuladorRendimentoCota');
            const cotacaoElem = document.getElementById('simuladorCotacaoAtual');
            const erroElem = document.getElementById('simuladorErro');

            erroElem.textContent = ''; // Limpa mensagens de erro anteriores

            if (!ticker) {
                rendimentoElem.textContent = '';
                cotacaoElem.textContent = '';
                currentSimulatedFii = null;
                return;
            }

            const fii = fiisDataHome[ticker];

            if (fii) {
                rendimentoElem.textContent = (fii.ultimo_rendimento || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                cotacaoElem.textContent = (fii.valor_cota || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                currentSimulatedFii = fii; 
            } else {
                rendimentoElem.textContent = '';
                cotacaoElem.textContent = '';
                erroElem.textContent = 'FII não encontrado na base de dados.';
                currentSimulatedFii = null;
            }
        }

        function calculateSimulator() {
            const rendaDesejadaStr = document.getElementById('simuladorRendaDesejada').value;
            const investimentoNecessarioElem = document.getElementById('simuladorInvestimentoNecessario');
            const cotasNecessariasElem = document.getElementById('simuladorCotasNecessarias');
            const erroElem = document.getElementById('simuladorErro');

            investimentoNecessarioElem.textContent = '';
            cotasNecessariasElem.textContent = '';
            erroElem.textContent = '';

            const rendaDesejada = parseFloat(rendaDesejadaStr.replace(',', '.')); // Garante que é um número com ponto decimal

            if (isNaN(rendaDesejada) || rendaDesejada <= 0) {
                erroElem.textContent = 'Por favor, digite uma renda mensal desejada válida e maior que zero.';
                return;
            }

            if (!currentSimulatedFii) {
                erroElem.textContent = 'Por favor, selecione um FII válido primeiro.';
                return;
            }

            const ultimoRendimento = currentSimulatedFii.ultimo_rendimento;
            const valorCota = currentSimulatedFii.valor_cota;

            if (!ultimoRendimento || ultimoRendimento <= 0) {
                erroElem.textContent = `O FII ${currentSimulatedFii.ticker} não possui rendimento por cota ou o rendimento é zero. Não é possível simular.`;
                return;
            }

            if (!valorCota || valorCota <= 0) {
                 erroElem.textContent = `O FII ${currentSimulatedFii.ticker} não possui cotação válida. Não é possível simular.`;
                 return;
            }

            const cotasNecessarias = rendaDesejada / ultimoRendimento;
            const investimentoNecessario = cotasNecessarias * valorCota;

            investimentoNecessarioElem.textContent = investimentoNecessario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            cotasNecessariasElem.textContent = `${Math.ceil(cotasNecessarias).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} cotas (arredondado para cima)`;

            let investimentoMensal = 0;
            const tipo = document.getElementById('tipoInvestimento').value;

            if (tipo === 'valor') {
                investimentoMensal = parseFloat(document.getElementById('simuladorInvestimentoMensal').value.replace(',', '.')) || 0;
            } else {
                const cotasMensais = parseFloat(document.getElementById('simuladorCotasMensais').value) || 0;
                investimentoMensal = cotasMensais * currentSimulatedFii.valor_cota;
            }

            const cotasAtuais = parseFloat(document.getElementById('simuladorCotasAtuais').value) || 0;

            const cotasFaltando = cotasNecessarias - cotasAtuais;

        // Sem reinvestir
            const mesesSemReinvestir = investimentoMensal > 0 ? cotasFaltando / (investimentoMensal / valorCota) : null;

        // Com reinvestir (simplesmente assumimos que o rendimento ajuda com 100% reinvestimento)
            const rendimentoMensalPorCota = ultimoRendimento;
            let saldo = 0;
            let cotasSimuladas = cotasAtuais;
            let mesesComReinvestir = 0;
            while (cotasSimuladas < cotasNecessarias && mesesComReinvestir < 600) {
                saldo += investimentoMensal + (cotasSimuladas * rendimentoMensalPorCota);
                const novasCotas = Math.floor(saldo / valorCota);
                saldo -= novasCotas * valorCota;
                cotasSimuladas += novasCotas;
                mesesComReinvestir++;
            }

        // Preenche no HTML
            document.getElementById('tempoSemReinvestir').textContent =
                mesesSemReinvestir ? `${Math.ceil(mesesSemReinvestir)} meses` : 'N/A';

            document.getElementById('tempoComReinvestir').textContent =
                `${mesesComReinvestir} meses`;

        
        }
        
        // Função de busca principal
        function searchFII() {
            const searchInput = document.getElementById('searchInput').value.trim().toUpperCase();
            if (searchInput) {
                // Redireciona para a página de detalhes, passando o ticker na URL
                window.location.href = `fii_detalhe.html?ticker=${searchInput}`;
            } else {
                alert('Por favor, digite o código do FII (Ex: VILG11).');
            }
        }

        // Permite buscar pressionando Enter no campo de busca
        function handleSearchEnter(event) {
            if (event.key === 'Enter') {
                searchFII();
            }
        }

        // Função para buscar e exibir dados no comparador
        function fetchComparatorData(fiiIdPrefix, ticker) {
            ticker = ticker.toUpperCase();
            const fii = fiisDataHome[ticker];

            // Função auxiliar para formatar grandes números (milhões/bilhões)
            function formatarGrandeNumero(num) {
                if (num === null || num === undefined) return 'N/A';
                if (num >= 1000000000) {
                    return (num / 1000000000).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + 'B';
                } else if (num >= 1000000) {
                    return (num / 1000000).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + 'M';
                } else if (num >= 1000) {
                    return num.toLocaleString('pt-BR');
                }
                return num.toLocaleString('pt-BR');
            }

            if (fii) {
                // Preenche os campos do comparador
                document.getElementById(`${fiiIdPrefix}_cotacao`).textContent = (fii.valor_cota || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                document.getElementById(`${fiiIdPrefix}_pvp`).textContent = (fii.pvp || 0).toFixed(2).replace('.', ',');
                document.getElementById(`${fiiIdPrefix}_dy`).textContent = (fii.dy || 0).toFixed(2).replace('.', ',') + '%';
                document.getElementById(`${fiiIdPrefix}_patrimonioLiquido`).textContent = formatarGrandeNumero(fii.patrimonio_liquido);
                document.getElementById(`${fiiIdPrefix}_cotistas`).textContent = (fii.cotistas || 0).toLocaleString('pt-BR');
                document.getElementById(`${fiiIdPrefix}_liquidezMediaDiaria`).textContent = formatarGrandeNumero(fii.liquidez_media_diaria);
                document.getElementById(`${fiiIdPrefix}_ultimoRendimento`).textContent = (fii.ultimo_rendimento || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            } else {
                // Limpa os campos se o FII não for encontrado
                document.getElementById(`${fiiIdPrefix}_cotacao`).textContent = ''; 
                document.getElementById(`${fiiIdPrefix}_pvp`).textContent = '';
                document.getElementById(`${fiiIdPrefix}_dy`).textContent = '';
                document.getElementById(`${fiiIdPrefix}_patrimonioLiquido`).textContent = '';
                document.getElementById(`${fiiIdPrefix}_cotistas`).textContent = '';
                document.getElementById(`${fiiIdPrefix}_liquidezMediaDiaria`).textContent = '';
                document.getElementById(`${fiiIdPrefix}_ultimoRendimento`).textContent = '';
            }
        }

        // Carrega os dados dos FIIs ao iniciar a página para o comparador
        document.addEventListener('DOMContentLoaded', loadFiisData);
