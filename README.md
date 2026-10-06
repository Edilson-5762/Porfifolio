# Portfólio de projetos | Edilson Ebenezer

Vitrine dos meus projetos de **desenvolvimento web, dados e IA**, no mesmo visual e com os mesmos efeitos do meu site pessoal.

- **Portfólio:** https://porfifolio-theta.vercel.app
- **Site pessoal:** https://developeredilsonebenezer.com.br
- **Contato:** contato@developeredilsonebenezer.com.br · [WhatsApp](https://api.whatsapp.com/send?phone=5561993998764&text=.) · [LinkedIn](https://www.linkedin.com/in/edilson-moraes-047128408)

## O que tem aqui

10 projetos, cada um com captura de tela, descrição, tecnologias e link:

| Projeto | Tipo | Tecnologias / destaque |
|---|---|---|
| Mario Bross | Jogo | HTML5, CSS3, JavaScript |
| Conversor de Moedas | Web | Conversão entre Real, Dólar e Euro |
| iPhone 17 | Landing page | Página responsiva do produto |
| Mercado Livre | E-commerce | Produtos e carrinho de compras |
| **Dashboard de Produção** | Dados & BI | Power BI → web, JavaScript, Chart.js |
| **Relatório de Vendas** | Dados & BI | Power BI → web, JavaScript, Chart.js |
| Gerenciador de Estoque | Desktop | Python, CustomTkinter, SQLite, Matplotlib |
| Customer Churn Analytics | IA & Dados | Python, tratamento de outliers (IQR), Information Value |
| CineAchado | Web | Aplicativo de streaming, 100% construído com Claude Code |
| Kings Cut Barbearia | Landing page | Agendamento online, galeria de cortes, depoimentos e chatbot de atendimento |

### Dashboards recriados do Power BI para a web

As duas páginas de dashboard (`dashboard-producao.html` e `dashboard-vendas.html`) recriam em HTML/JavaScript os modelos que montei no Power BI, com **filtros que recalculam os indicadores e gráficos de verdade** no navegador (operador e mês na Produção; ano, mês, produto, categoria, marca e localidade em Vendas). Os dados são de uma **base de estudo** (não de uma empresa), agregados em `assets/producao-data.js` e `assets/vendas-data.js`, e os arquivos originais estão em `projetos/` para download.

## Tecnologias

HTML5 · CSS3 · JavaScript (sem framework) · Chart.js (apenas nos dashboards) · Phosphor Icons (fonte reduzida) · fontes hospedadas localmente · hospedagem na Vercel.

## Como foi feito (resumo)

- As páginas são **geradas** a partir do repositório do site pessoal (`_scratch/export_portfolio.py`), o que garante o mesmo visual e os mesmos efeitos nos dois lugares.
- **Desempenho:** sem `backdrop-filter`, animações só onde o olho está, canvas do rastro em meia resolução e fontes/ícones locais. Medido com o profiler do Chrome (CPU limitada 4x): o mouse sobre os cartões foi de cerca de 5 para mais de 50 quadros por segundo.
- **Acessibilidade:** efeitos de mouse só em dispositivos com mouse e desligados com `prefers-reduced-motion`; navegação por teclado.
- **Privacidade:** nenhuma requisição a terceiros em tempo de execução, sem cookies e sem rastreadores.

## Estrutura

```text
.
├── index.html                  # lista de projetos
├── dashboard-producao.html     # dashboard de produção (filtros reais)
├── dashboard-vendas.html       # relatório de vendas (filtros reais)
├── style.css, dash.css         # visual (o mesmo do site pessoal) e estilos dos dashboards
├── script.js                   # efeitos e interações
├── projetos/                   # arquivos .pbix originais dos dashboards
└── assets/                     # fontes, capturas, dados dos dashboards, Chart.js
```

## Rodar localmente

```bash
python -m http.server 8000   # e acesse http://localhost:8000
```

## Licença e uso do conteúdo

Textos, capturas e identidade visual: **© 2026 Edilson Ebenezer. Todos os direitos reservados.** O código está disponível para consulta e estudo; para reutilizá-lo, entre em contato.
