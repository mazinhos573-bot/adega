document.addEventListener('DOMContentLoaded', () => {
    // Dados iniciais
    let produtos = JSON.parse(localStorage.getItem('produtos')) || [
        {
            id: 1,
            nome: "Vinho Tinto Cabernet Sauvignon",
            preco: 89.90,
            imagem: "https://picsum.photos/id/201/300/300",
            codigoBarras: "1234567890123",
            vencimento: "2026-12-15",
            quantidade: 45
        },
        {
            id: 2,
            nome: "Espumante Brut",
            preco: 129.90,
            imagem: "https://picsum.photos/id/237/300/300",
            codigoBarras: "9876543210987",
            vencimento: "2025-08-20",
            quantidade: 18
        }
    ];

    const carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
    const promocoes = JSON.parse(localStorage.getItem('promocoes')) || [];

    function salvarProdutos() { localStorage.setItem('produtos', JSON.stringify(produtos)); }
    function salvarCarrinho() { localStorage.setItem('carrinho', JSON.stringify(carrinho)); }
    function salvarPromocoes() { localStorage.setItem('promocoes', JSON.stringify(promocoes)); }

    function formatReal(v){ return `R$ ${v.toFixed(2)}` }

    // Integrar promoções aos produtos
    function getPrecoProduto(prod) {
        const promo = promocoes.find(p => p.id === prod.id);
        return promo ? parseFloat(promo.precoPromo) : prod.preco;
    }

    function renderProdutos() {
        const container = document.getElementById('produtosContainer');
        if (!container) return;
        const termo = (document.getElementById('searchInput') || {value:''}).value.trim().toLowerCase();
        container.innerHTML = '';

        produtos
            .filter(p => {
                if (!termo) return true;
                return (p.nome || '').toLowerCase().includes(termo) || (p.codigoBarras || '').includes(termo);
            })
            .forEach(prod => {
                const hoje = new Date();
                const venc = new Date(prod.vencimento);
                const dias = Math.ceil((venc - hoje) / (1000*60*60*24));
                const isVencido = dias < 0;

                    const card = document.createElement('div');
                    card.className = 'col-md-6 col-lg-4 mb-4 fade-in';
                    card.innerHTML = `
                        <div class="card product-card card-soft h-100 ${isVencido ? 'vencido' : ''}">
                        <img src="${prod.imagem}" class="card-img-top" style="height: 220px; object-fit: cover;">
                        <div class="card-body d-flex flex-column">
                            <h5 class="card-title">${prod.nome}</h5>
                            ${promocoes.find(p => p.id === prod.id) ? `<span class="badge bg-danger mb-2">-${promocoes.find(p => p.id === prod.id).desconto}% OFF</span>` : ''}
                            <p class="fs-4 fw-bold text-accent">${formatReal(getPrecoProduto(prod))}</p>
                            ${promocoes.find(p => p.id === prod.id) ? `<p class="small"><del class="text-muted">R$ ${prod.preco.toFixed(2)}</del></p>` : ''}
                            </p>
                            <div class="mt-auto">
                                    <button class="btn btn-sm btn-outline-secondary w-100" data-id="${prod.id}">Adicionar</button>
                            </div>
                        </div>
                    </div>
                `;

                // event delegation for button inside card
                card.querySelector('button[data-id]')?.addEventListener('click', (e)=>{
                    biparProdutoById(prod.id);
                    animateAddToCart(e.target);
                });

                container.appendChild(card);
        });
    }

    function renderCarrinho() {
        const body = document.getElementById('carrinhoBody');
        const totalEl = document.getElementById('totalNota');
        if (!body || !totalEl) return;
        body.innerHTML = '';

        if (carrinho.length === 0) {
            body.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Nenhum item adicionado.</td></tr>';
            totalEl.textContent = formatReal(0);
            return;
        }

        let total = 0;
        carrinho.forEach(item => {
            const precoAtual = getPrecoProduto({id: item.id, preco: item.preco});
            const subtotal = precoAtual * item.quantidade;
            total += subtotal;
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${item.nome}</td><td class="text-end">${item.quantidade}</td><td class="text-end">${formatReal(subtotal)}</td>`;
            body.appendChild(tr);
        });

        totalEl.textContent = formatReal(total);
    }

    function adicionarAoCarrinho(produto) {
        const item = carrinho.find(i => i.id === produto.id);
        const quantidadeNoCarrinho = item ? item.quantidade : 0;

        if (produto.quantidade <= quantidadeNoCarrinho) {
            alert('Estoque insuficiente para adicionar mais unidades deste produto.');
            return;
        }

        if (item) {
            item.quantidade += 1;
        } else {
            carrinho.push({ id: produto.id, nome: produto.nome, preco: getPrecoProduto(produto), quantidade: 1 });
        }

        salvarCarrinho();
        renderCarrinho();
    }

    function biparProduto() {
        const codigoEl = document.getElementById('barcodeInput');
        const codigo = codigoEl ? codigoEl.value.trim() : '';
        if (!codigo) { alert('Digite ou escaneie um código de barras.'); return; }

        const produto = produtos.find(p => p.codigoBarras === codigo || (p.id && String(p.id) === codigo));
        if (!produto) { alert('Produto não encontrado para o código informado.'); return; }

        adicionarAoCarrinho(produto);
        if (codigoEl) codigoEl.value = '';
        animateAddToCart(codigoEl);
    }

    function biparProdutoById(id) {
        const produto = produtos.find(p => p.id === id);
        if (!produto) return;
        adicionarAoCarrinho(produto);
    }

    function limparCarrinho() {
        if (confirm('Deseja limpar a nota fiscal?')) {
            carrinho.length = 0;
            salvarCarrinho();
            renderCarrinho();
        }
    }

    function finalizarCompra() {
        if (carrinho.length === 0) {
            alert('Carrinho vazio! Adicione produtos antes de finalizar.');
            return;
        }

        // Calcular total
        let total = 0;
        carrinho.forEach(item => {
            const precoAtual = getPrecoProduto({id: item.id, preco: item.preco});
            total += precoAtual * item.quantidade;
        });

        // Descontar estoque
        carrinho.forEach(item => {
            const prod = produtos.find(p => p.id === item.id);
            if (prod) {
                prod.quantidade -= item.quantidade;
            }
        });
        salvarProdutos();

        // Gerar e imprimir nota
        imprimirNota(total);

        // Limpar carrinho
        carrinho.length = 0;
        salvarCarrinho();
        renderProdutos();
        renderCarrinho();
        alert('Compra finalizada com sucesso! A nota foi impressa.');
    }

    function cancelarCompra() {
        if (confirm('Deseja cancelar a compra atual?')) {
            limparCarrinho();
        }
    }

    function imprimirNota(total) {
        const data = new Date().toLocaleString('pt-BR');
        let conteudo = `
            <html>
            <head>
                <title>Nota Fiscal - Adega EVO</title>
                <style>
                    body { font-family: Arial; font-size: 12px; margin: 0; padding: 10px; }
                    .header { text-align: center; font-weight: bold; margin-bottom: 15px; }
                    .divider { border-top: 1px dashed #000; margin: 5px 0; }
                    .item { display: flex; justify-content: space-between; margin: 5px 0; }
                    .total { font-weight: bold; font-size: 14px; margin-top: 10px; }
                    .footer { text-align: center; margin-top: 15px; font-size: 10px; }
                </style>
            </head>
            <body>
                <div class="header">ADEGA EVO<br>Nota de Venda</div>
                <div class="divider"></div>
                <div>Data/Hora: ${data}</div>
                <div class="divider"></div>
        `;

        carrinho.forEach(item => {
            const precoAtual = getPrecoProduto({id: item.id, preco: item.preco});
            const subtotal = precoAtual * item.quantidade;
            conteudo += `<div class="item"><span>${item.nome} (${item.quantidade}x)</span><span>R$ ${subtotal.toFixed(2)}</span></div>`;
        });

        conteudo += `
                <div class="divider"></div>
                <div class="total item"><span>TOTAL:</span><span>R$ ${total.toFixed(2)}</span></div>
                <div class="footer">
                    Obrigado pela compra!<br>
                    Adega EVO - Sistema Profissional
                </div>
            </body>
            </html>
        `;

        const janelaImpressao = window.open('', '', 'height=400,width=600');
        janelaImpressao.document.write(conteudo);
        janelaImpressao.document.close();
        janelaImpressao.print();
    }

    function animateAddToCart(target){
        const rect = target.getBoundingClientRect();
        const el = document.createElement('div');
        el.textContent = '+1';
        el.style.position = 'fixed';
        el.style.left = `${rect.left + rect.width/2}px`;
        el.style.top = `${rect.top}px`;
        el.style.transform = 'translate(-50%,0)';
        el.style.padding = '6px 10px';
        el.style.borderRadius = '999px';
            el.style.background = 'linear-gradient(90deg,#ffd9e0,#8b1e3f)';
            el.style.color = '#fff';
        el.style.zIndex = 2000;
        el.style.transition = 'transform .8s ease, opacity .8s ease';
        document.body.appendChild(el);
        requestAnimationFrame(()=>{
            el.style.transform = 'translate(-50%,-120px) scale(1.2)';
            el.style.opacity = '0';
        });
        setTimeout(()=>el.remove(),900);
    }

    // Busca ao digitar
    const searchInput = document.getElementById('searchInput');
    searchInput?.addEventListener('input', () => renderProdutos());

    // Atalhos
    document.getElementById('barcodeInput')?.addEventListener('keydown', (e)=>{ if(e.key==='Enter') biparProduto(); });

    // Expor funções globais usadas por outros HTML (se necessário)
    window.biparProduto = biparProduto;
    window.biparProdutoById = biparProdutoById;
    window.limparCarrinho = limparCarrinho;
    window.finalizarCompra = finalizarCompra;
    window.cancelarCompra = cancelarCompra;
    window.mostrarPromoRotativa = mostrarPromoRotativa;

    // Display de promoções a cada 1 minuto
    function mostrarPromoRotativa() {
        const container = document.getElementById('promoRotativaContainer');
        if (!container || promocoes.length === 0) return;

        let index = 0;
        const mostrarProxima = () => {
            container.innerHTML = '';
            if (index >= promocoes.length) index = 0;

            const promo = promocoes[index];
            const card = document.createElement('div');
            card.className = 'promo-rotativa fade-in';
            card.innerHTML = `
                <div class="card card-soft">
                    <img src="${promo.imagem}" style="height: 120px; object-fit: cover;">
                    <div class="card-body">
                        <span class="badge bg-danger">-${promo.desconto}% OFF</span>
                        <h6>${promo.nome}</h6>
                        <p class="mb-0"><strong>R$ ${promo.precoPromo}</strong></p>
                    </div>
                </div>
            `;
            container.appendChild(card);
            index++;
        };

        mostrarProxima();
        setInterval(mostrarProxima, 60000); // 1 minuto
    }

    // Inicialização
    renderProdutos();
    renderCarrinho();
    mostrarPromoRotativa();
});
