const httpProxy = require('express-http-proxy');
const express = require('express');
const app = express();
var logger = require('morgan');

app.use(logger('dev'));

// Função para selecionar o host do microservice correto
function selectProxyHost(req) {
    if (req.path.startsWith('/usuarios'))
        return 'http://localhost:8081/';
    else if (req.path.startsWith('/ingressos'))
        return 'http://localhost:8082/';
    else if (req.path.startsWith('/atracoes'))
        return 'http://localhost:8083/';
    else if (req.path.startsWith('/filas'))
        return 'http://localhost:8084/';
    else if (req.path.startsWith('/estimativa'))
        return 'http://localhost:8085/';
    else 
        return null;
}

// Middleware para roteamento
app.use((req, res, next) => {
    var proxyHost = selectProxyHost(req);
    if (proxyHost == null)
        res.status(404).json({ erro: 'Serviço não encontrado' });
    else
        httpProxy(proxyHost)(req, res, next);
});

// Inicia o API Gateway
app.listen(8000, () => {
    console.log('API Gateway iniciado na porta 8000!');
    console.log('Rotas disponíveis:');
    console.log('  - /usuarios        -> Cadastro de Usuários (porta 8081)');
    console.log('  - /ingressos       -> Controle de Ingressos (porta 8082)');
    console.log('  - /atracoes        -> Cadastro de Atrações (porta 8083)');
    console.log('  - /filas           -> Controle de Filas (porta 8084)');
    console.log('  - /estimativa      -> Estimador de Espera (porta 8085)');
});
