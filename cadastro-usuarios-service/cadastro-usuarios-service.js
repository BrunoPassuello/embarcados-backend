// Inicia o Express.js
const express = require('express');
const app = express();

// Body Parser - usado para processar dados da requisição HTTP
const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

// Importa o package do SQLite
const sqlite3 = require('sqlite3');

// Acessa o arquivo com o banco de dados
var db = new sqlite3.Database('./usuarios.db', (err) => {
    if (err) {
        console.log('ERRO: não foi possível conectar ao SQLite.');
        throw err;
    }
    console.log('Conectado ao SQLite!');
});

//Cria a tabela usuarios caso ela não exista
db.run(`CREATE TABLE IF NOT EXISTS usuarios 
        (id INTEGER PRIMARY KEY AUTOINCREMENT, 
        nome TEXT NOT NULL, 
        email TEXT NOT NULL UNIQUE, 
        telefone TEXT NOT NULL)`, 
        [], (err) => {
            if (err) {
                console.log('ERRO: não foi possível criar tabela.');
                throw err;
            }
        });

//POST FROM /usuarios 
app.post('/usuarios', (req, res) => {
    const { nome, email, telefone } = req.body;
    
    if (!nome || !email || !telefone) {
        return res.status(400).json({ erro: 'Nome, email e telefone são obrigatórios.' });
    }

    db.run(`INSERT INTO usuarios(nome, email, telefone) VALUES(?,?,?)`, 
        [nome, email, telefone], function(err) {
        if (err) {
            console.log("Erro: " + err);
            res.status(500).json({ erro: 'Erro ao cadastrar usuário.' });
        } else {
            console.log('Usuário cadastrado com sucesso!');
            res.status(201).json({ 
                id: this.lastID,
                nome, 
                email, 
                telefone,
                mensagem: 'Usuário cadastrado com sucesso!' 
            });
        }
    });
});

//GET FROM /usuarios 
app.get('/usuarios', (req, res) => {
    db.all(`SELECT * FROM usuarios`, [], (err, result) => {
        if (err) {
            console.log("Erro: " + err);
            res.status(500).json({ erro: 'Erro ao obter dados.' });
        } else {
            res.status(200).json(result);
        }
    });
});

//GET FROM /usuarios/:id 
app.get('/usuarios/:id', (req, res) => {
    db.get(`SELECT * FROM usuarios WHERE id = ?`, 
            req.params.id, (err, result) => {
        if (err) { 
            console.log("Erro: "+err);
            res.status(500).json({ erro: 'Erro ao obter dados.' });
        } else if (result == null) {
            console.log("Usuário não encontrado.");
            res.status(404).json({ erro: 'Usuário não encontrado.' });
        } else {
            res.status(200).json(result);
        }
    });
});

//PATCH FROM /usuarios/:id 
app.patch('/usuarios/:id', (req, res) => {
    const { nome, email, telefone } = req.body;
    
    db.run(`UPDATE usuarios SET 
            nome = COALESCE(?,nome), 
            email = COALESCE(?,email), 
            telefone = COALESCE(?,telefone) 
            WHERE id = ?`,
            [nome, email, telefone, req.params.id], function(err) {
            if (err){
                res.status(500).json({ erro: 'Erro ao alterar dados.' });
            } else if (this.changes == 0) {
                console.log("Usuário não encontrado.");
                res.status(404).json({ erro: 'Usuário não encontrado.' });
            } else {
                res.status(200).json({ mensagem: 'Usuário alterado com sucesso!' });
            }
    });
});

//DELETE FROM /usuarios/:id 
app.delete('/usuarios/:id', (req, res) => {
    db.run(`DELETE FROM usuarios WHERE id = ?`, req.params.id, function(err) {
        if (err){
            res.status(500).json({ erro: 'Erro ao remover usuário.' });
        } else if (this.changes == 0) {
            console.log("Usuário não encontrado.");
            res.status(404).json({ erro: 'Usuário não encontrado.' });
        } else {
            res.status(200).json({ mensagem: 'Usuário removido com sucesso!' });
        }
    });
});

//Servidor -> porta 8081
let porta = 8081;
app.listen(porta, () => {
    console.log('Serviço de Cadastro de Usuários executando na porta: ' + porta);
});
