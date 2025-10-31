const express = require('express');
const app = express();
const bodyParser = require('body-parser');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

const sqlite3 = require('sqlite3');

var db = new sqlite3.Database('./atracoes.db', (err) => {
    if (err) {
        console.log('ERRO: não foi possível conectar ao SQLite.');
        throw err;
    }
    console.log('Conectado ao SQLite!');
});

//Cria a tabela atracoes caso ela não exista
db.run(`CREATE TABLE IF NOT EXISTS atracoes 
        (id INTEGER PRIMARY KEY AUTOINCREMENT, 
        nome TEXT NOT NULL, 
        capacidade INTEGER NOT NULL,
        tempo_permanencia INTEGER NOT NULL,
        funcionando INTEGER DEFAULT 1)`, 
        [], (err) => {
        if (err) {
            console.log('ERRO: não foi possível criar tabela.');
            throw err;
        }
    });

//POST /atracoes 
app.post('/atracoes', (req, res) => {
    const { nome, capacidade, tempo_permanencia } = req.body;
    
    if (!nome || !capacidade || !tempo_permanencia) {
        return res.status(400).json({ 
            erro: 'Nome, capacidade e tempo de permanência são obrigatórios.' 
        });
    }

    db.run(`INSERT INTO atracoes(nome, capacidade, tempo_permanencia, funcionando) 
            VALUES(?,?,?,1)`, 
        [nome, capacidade, tempo_permanencia], function(err) {
        if (err) {
            console.log("Erro: " + err);
            res.status(500).json({ erro: 'Erro ao cadastrar atração.' });
        } else {
            console.log('Atração cadastrada com sucesso!');
            res.status(201).json({ 
                id: this.lastID,
                nome, 
                capacidade, 
                tempo_permanencia,
                funcionando: 1,
                mensagem: 'Atração cadastrada com sucesso!' 
            });
        }
    });
});

//GET /atracoes 
app.get('/atracoes', (req, res) => {
    db.all(`SELECT * FROM atracoes`, [], (err, result) => {
        if (err) {
            console.log("Erro: " + err);
            res.status(500).json({ erro: 'Erro ao obter dados.' });
        } else {
            res.status(200).json(result);
        }
    });
});

//GET /atracoes/:id 
app.get('/atracoes/:id', (req, res) => {
    db.get(`SELECT * FROM atracoes WHERE id = ?`, 
            req.params.id, (err, result) => {
        if (err) { 
            console.log("Erro: "+err);
            res.status(500).json({ erro: 'Erro ao obter dados.' });
        } else if (result == null) {
            console.log("Atração não encontrada.");
            res.status(404).json({ erro: 'Atração não encontrada.' });
        } else {
            res.status(200).json(result);
        }
    });
});

//PATCH /atracoes/:id 
app.patch('/atracoes/:id', (req, res) => {
    const { nome, capacidade, tempo_permanencia, funcionando } = req.body;
    
    db.run(`UPDATE atracoes SET 
            nome = COALESCE(?,nome), 
            capacidade = COALESCE(?,capacidade), 
            tempo_permanencia = COALESCE(?,tempo_permanencia),
            funcionando = COALESCE(?,funcionando) 
            WHERE id = ?`,
            [nome, capacidade, tempo_permanencia, funcionando, req.params.id], 
            function(err) {
                if (err){
                    res.status(500).json({ erro: 'Erro ao alterar dados.' });
                } else if (this.changes == 0) {
                    console.log("Atração não encontrada.");
                    res.status(404).json({ erro: 'Atração não encontrada.' });
                } else {
                    res.status(200).json({ mensagem: 'Atração alterada com sucesso!' });
                }
    });
});

//DELETE /atracoes/:id 
app.delete('/atracoes/:id', (req, res) => {
    db.run(`DELETE FROM atracoes WHERE id = ?`, req.params.id, function(err) {
        if (err){
            res.status(500).json({ erro: 'Erro ao remover atração.' });
        } else if (this.changes == 0) {
            console.log("Atração não encontrada.");
            res.status(404).json({ erro: 'Atração não encontrada.' });
        } else {
            res.status(200).json({ mensagem: 'Atração removida com sucesso!' });
        }
    });
});

//Servidor -> porta 8083
let porta = 8083;
app.listen(porta, () => {
    console.log('Serviço de Cadastro de Atrações executando na porta: ' + porta);
});
