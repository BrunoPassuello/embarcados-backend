const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const axios = require('axios');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

const sqlite3 = require('sqlite3');

var db = new sqlite3.Database('./filas.db', (err) => {
    if (err) {
        console.log('ERRO: não foi possível conectar ao SQLite.');
        throw err;
    }
    console.log('Conectado ao SQLite!');
});

//Cria a tabela filas caso ela não exista
db.run(`CREATE TABLE IF NOT EXISTS filas 
        (id INTEGER PRIMARY KEY AUTOINCREMENT, 
        atracao_id INTEGER NOT NULL UNIQUE,
        pessoas_fila INTEGER DEFAULT 0)`, 
        [], (err) => {
            if (err) {
                console.log('ERRO: não foi possível criar tabela.');
                throw err;
            }
        });

//POST /filas/inicializar/:atracao_id 
app.post('/filas/inicializar/:atracao_id', async (req, res) => {
    const atracao_id = req.params.atracao_id;
    
    // Verifica se a atração existe
    try {
        const response = await axios.get(`http://localhost:8083/atracoes/${atracao_id}`);
        if (!response.data) {
            return res.status(404).json({ erro: 'Atração não encontrada.' });
        }
    } catch (error) {
        return res.status(404).json({ erro: 'Atração não encontrada.' });
    }

    db.run(`INSERT INTO filas(atracao_id, pessoas_fila) VALUES(?,0)`, 
            [atracao_id], function(err) {
        if (err) {
            console.log("Erro: " + err);
            res.status(500).json({ erro: 'Erro ao inicializar fila.' });
        } else {
            console.log('Fila inicializada com sucesso!');
            res.status(201).json({ 
                id: this.lastID,
                atracao_id,
                pessoas_fila: 0,
                mensagem: 'Fila inicializada com sucesso!' 
            });
        }
    });
});

//POST /filas/entrada/:atracao_id 
app.post('/filas/entrada/:atracao_id', (req, res) => {
    const atracao_id = req.params.atracao_id;
    
    db.run(`UPDATE filas SET pessoas_fila = pessoas_fila + 1 WHERE atracao_id = ?`,
            [atracao_id], function(err) {
        if (err){
            res.status(500).json({ erro: 'Erro ao registrar entrada.' });
        } else if (this.changes == 0) {
            console.log("Fila não encontrada.");
            res.status(404).json({ erro: 'Fila não encontrada.' });
        } else {
            // Retorna o número atualizado de pessoas na fila
            db.get(`SELECT pessoas_fila FROM filas WHERE atracao_id = ?`, 
                    [atracao_id], (err, result) => {
                if (err) {
                    res.status(500).json({ erro: 'Erro ao obter dados.' });
                } else {
                    res.status(200).json({ 
                        atracao_id,
                        pessoas_fila: result.pessoas_fila,
                        mensagem: 'Entrada registrada com sucesso!' 
                    });
                }
            });
        }
    });
});

//HTTP POST /filas/saida/:atracao_id
app.post('/filas/saida/:atracao_id', (req, res) => {
    const atracao_id = req.params.atracao_id;
    
    db.run(`UPDATE filas SET pessoas_fila = MAX(0, pessoas_fila - 1) WHERE atracao_id = ?`,
            [atracao_id], function(err) {
        if (err){
            res.status(500).json({ erro: 'Erro ao registrar saída.' });
        } else if (this.changes == 0) {
            console.log("Fila não encontrada.");
            res.status(404).json({ erro: 'Fila não encontrada.' });
        } else {
            // Retorna o número atualizado de pessoas na fila
            db.get(`SELECT pessoas_fila FROM filas WHERE atracao_id = ?`, 
                    [atracao_id], (err, result) => {
                if (err) {
                    res.status(500).json({ erro: 'Erro ao obter dados.' });
                } else {
                    res.status(200).json({ 
                        atracao_id,
                        pessoas_fila: result.pessoas_fila,
                        mensagem: 'Saída registrada com sucesso!' 
                    });
                }
            });
        }
    });
});

//HTTP GET /filas/:atracao_id - retorna número de pessoas na fila
app.get('/filas/:atracao_id', (req, res) => {
    db.get(`SELECT * FROM filas WHERE atracao_id = ?`, 
            req.params.atracao_id, (err, result) => {
        if (err) { 
            console.log("Erro: "+err);
            res.status(500).json({ erro: 'Erro ao obter dados.' });
        } else if (result == null) {
            console.log("Fila não encontrada.");
            res.status(404).json({ erro: 'Fila não encontrada.' });
        } else {
            res.status(200).json(result);
        }
    });
});

//HTTP GET /filas 
app.get('/filas', (req, res) => {
    db.all(`SELECT * FROM filas`, [], (err, result) => {
        if (err) {
            console.log("Erro: " + err);
            res.status(500).json({ erro: 'Erro ao obter dados.' });
        } else {
            res.status(200).json(result);
        }
    });
});

//Servidor -> porta 8084
let porta = 8084;
app.listen(porta, () => {
    console.log('Serviço de Controle de Filas executando na porta: ' + porta);
});
