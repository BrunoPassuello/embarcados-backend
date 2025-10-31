const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const axios = require('axios');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

const sqlite3 = require('sqlite3');

var db = new sqlite3.Database('./ingressos.db', (err) => {
    if (err) {
        console.log('ERRO: não foi possível conectar ao SQLite.');
        throw err;
    }
    console.log('Conectado ao SQLite!');
});

//Cria a tabela ingressos caso ela não exista
db.run(`CREATE TABLE IF NOT EXISTS ingressos 
        (id INTEGER PRIMARY KEY AUTOINCREMENT, 
         usuario_id INTEGER NOT NULL, 
         tipo TEXT NOT NULL,
         data_compra DATE NOT NULL,
         data_validade DATE NOT NULL,
         ativo INTEGER DEFAULT 1)`, 
        [], (err) => {
           if (err) {
                console.log('ERRO: não foi possível criar tabela.');
                throw err;
            }
      });

//POST FROM /ingressos - compra de um novo ingresso
app.post('/ingressos', async (req, res) => {
    const { usuario_id } = req.body;
    
    if (!usuario_id) {
        return res.status(400).json({ erro: 'ID do usuário é obrigatório.' });
    }

    //Verifica se o usuário existe
    try {
        const response = await axios.get(`http://localhost:8081/usuarios/${usuario_id}`);
        if (!response.data) {
            return res.status(404).json({ erro: 'Usuário não encontrado.' });
        }
    } catch (error) {
        return res.status(404).json({ erro: 'Usuário não encontrado.' });
    }

    //Ingresso válido por 1 dia
    const tipo = 'DIARIO';
    const dataCompra = new Date();
    const dataValidade = new Date(dataCompra);
    dataValidade.setDate(dataValidade.getDate() + 1); // Válido por 1 dia

    db.run(`INSERT INTO ingressos(usuario_id, tipo, data_compra, data_validade, ativo) 
            VALUES(?,?,?,?,1)`, 
        [usuario_id, tipo, dataCompra.toISOString(), dataValidade.toISOString()], 
        function(err) {
            if (err) {
                console.log("Erro: " + err);
                res.status(500).json({ erro: 'Erro ao comprar ingresso.' });
            } else {
                console.log('Ingresso comprado com sucesso!');
                res.status(201).json({ 
                    id: this.lastID,
                    usuario_id,
                    tipo,
                    data_compra: dataCompra.toISOString(),
                    data_validade: dataValidade.toISOString(),
                    mensagem: 'Ingresso comprado com sucesso!' 
                });
            }
    });
});

//GET FROM /ingressos/usuario/:usuario_id
app.get('/ingressos/usuario/:usuario_id', (req, res) => {
    db.all(`SELECT * FROM ingressos WHERE usuario_id = ? AND ativo = 1`, 
            [req.params.usuario_id], (err, result) => {
        if (err) { 
            console.log("Erro: "+err);
            res.status(500).json({ erro: 'Erro ao obter dados.' });
        } else {
            res.status(200).json(result);
        }
    });
});

//GET FROM /ingressos/:id 
app.get('/ingressos/:id', (req, res) => {
    db.get(`SELECT * FROM ingressos WHERE id = ?`, 
            req.params.id, (err, result) => {
        if (err) { 
            console.log("Erro: "+err);
            res.status(500).json({ erro: 'Erro ao obter dados.' });
        } else if (result == null) {
            console.log("Ingresso não encontrado.");
            res.status(404).json({ erro: 'Ingresso não encontrado.' });
        } else {
            res.status(200).json(result);
        }
    });
});

//POST FROM /ingressos/validar
app.post('/ingressos/validar', (req, res) => {
    const { ingresso_id } = req.body;
    
    if (!ingresso_id) {
        return res.status(400).json({ erro: 'ID do ingresso é obrigatório.' });
    }

    db.get(`SELECT * FROM ingressos WHERE id = ? AND ativo = 1`, 
            ingresso_id, (err, result) => {
        if (err) { 
            console.log("Erro: "+err);
            res.status(500).json({ erro: 'Erro ao validar ingresso.' });
        } else if (result == null) {
            res.status(404).json({ 
                valido: false, 
                erro: 'Ingresso não encontrado ou inativo.' 
            });
        } else {
            // Verifica se o ingresso está dentro da validade
            const dataAtual = new Date();
            const dataValidade = new Date(result.data_validade);
            
            if (dataAtual > dataValidade) {
                res.status(200).json({ 
                    valido: false, 
                    mensagem: 'Ingresso expirado.' 
                });
            } else {
                res.status(200).json({ 
                    valido: true, 
                    ingresso: result,
                    mensagem: 'Ingresso válido!' 
                });
            }
        }
    });
});

//GET FROM /ingressos 
app.get('/ingressos', (req, res) => {
    db.all(`SELECT * FROM ingressos`, [], (err, result) => {
        if (err) {
            console.log("Erro: " + err);
            res.status(500).json({ erro: 'Erro ao obter dados.' });
        } else {
            res.status(200).json(result);
        }
    });
});

//Servidor -> porta 8082
let porta = 8082;
app.listen(porta, () => {
    console.log('Serviço de Controle de Ingressos executando na porta: ' + porta);
});
