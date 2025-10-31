const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const axios = require('axios');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

async function calcularTempoEspera(atracao_id) {
    try {
        // Obtém dados da atração
        const atracaoResponse = await axios.get(`http://localhost:8083/atracoes/${atracao_id}`);
        const atracao = atracaoResponse.data;
        
        if (!atracao.funcionando) {
            return { 
                atracao_id, 
                tempo_espera: null, 
                mensagem: 'Atração não está funcionando.' 
            };
        }
        
        // Obtém número de pessoas na fila
        const filaResponse = await axios.get(`http://localhost:8084/filas/${atracao_id}`);
        const fila = filaResponse.data;
        
        // Calcula tempo de espera
        // Tempo = (pessoas na fila / capacidade) * tempo de permanência
        const ciclos = Math.ceil(fila.pessoas_fila / atracao.capacidade);
        const tempoEspera = ciclos * atracao.tempo_permanencia; // em minutos
        
        return {
            atracao_id,
            nome_atracao: atracao.nome,
            pessoas_fila: fila.pessoas_fila,
            capacidade: atracao.capacidade,
            tempo_permanencia: atracao.tempo_permanencia,
            tempo_espera_minutos: tempoEspera,
            funcionando: atracao.funcionando
        };
        
    } catch (error) {
        console.log("Erro ao calcular tempo de espera:", error.message);
        throw error;
    }
}

//GET /estimativa/:atracao_id - retorna estimativa de espera por atração
app.get('/estimativa/:atracao_id', async (req, res) => {
    try {
        const estimativa = await calcularTempoEspera(req.params.atracao_id);
        res.status(200).json(estimativa);
    } catch (error) {
        res.status(500).json({ erro: 'Erro ao calcular estimativa de espera.' });
    }
});

//GET /estimativa - retorna estimativas de todas as atrações
app.get('/estimativa', async (req, res) => {
    try {
        // Obtém todas as filas
        const filasResponse = await axios.get('http://localhost:8084/filas');
        const filas = filasResponse.data;
        
        // Calcula estimativa para cada atração
        const estimativas = await Promise.all(
            filas.map(fila => calcularTempoEspera(fila.atracao_id))
        );
        
        res.status(200).json(estimativas);
    } catch (error) {
        res.status(500).json({ erro: 'Erro ao calcular estimativas.' });
    }
});

// Atualização automática a cada 30 segundos
setInterval(async () => {
    try {
        console.log('Recalculando estimativas de espera...');
        const filasResponse = await axios.get('http://localhost:8084/filas');
        const filas = filasResponse.data;
        
        for (const fila of filas) {
            const estimativa = await calcularTempoEspera(fila.atracao_id);
            console.log(`Atração ${estimativa.nome_atracao}: ${estimativa.tempo_espera_minutos} minutos`);
        }
    } catch (error) {
        console.log('Erro ao recalcular estimativas:', error.message);
    }
}, 30000); // 30 segundos

//Servidor -> porta 8085
let porta = 8085;
app.listen(porta, () => {
    console.log('Serviço Estimador de Espera executando na porta: ' + porta);
});
