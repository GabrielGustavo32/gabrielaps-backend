// 1. Importar os pacotes
require('dotenv').config(); 
const express = require('express');
const mongoose = require('mongoose');
const path = require('path'); 
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// 2. Configurar o App
const app = express();
app.use(cors());
app.use(express.json());

// --- Variáveis de Ambiente (Lidas do .env) ---
const mongoURI = process.env.MONGO_URI;
const jwtSecret = process.env.JWT_SECRET;

// "Serve" seus arquivos HTML da pasta 'gabrielaps-frontend'
app.use(express.static(path.join(__dirname, '../gabrielaps-frontend')));

// 3. Conectar ao MongoDB Atlas
mongoose.connect(mongoURI)
    .then(() => console.log('>>> SUCESSO! Conectado ao MongoDB Atlas <<<'))
    .catch(err => console.error('XXX ERRO AO CONECTAR: XXX', err));

// 4. Definir os "Modelos" (Os 3 Cadastros)
// ----------------------------------------------------
// MODELO 1: Usuário (Para Login e CRUD 1)
// ----------------------------------------------------
const UsuarioSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    login: { type: String, required: true, unique: true },
    senha: { type: String, required: true },
    perfil: { type: String, required: true, default: 'Usuário' }
});

UsuarioSchema.pre('save', async function (next) {
    if (!this.isModified('senha')) return next();
    const hash = await bcrypt.hash(this.senha, 10);
    this.senha = hash;
    next();
});
const Usuario = mongoose.model('Usuario', UsuarioSchema);

// ----------------------------------------------------
// MODELO 2: Produto (CRUD 2)
// ----------------------------------------------------
const ProdutoSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    categoria: { type: String, default: 'Geral' },
    quantidade: { type: Number, default: 0 },
    preco: { type: Number, default: 0 }
});
const Produto = mongoose.model('Produto', ProdutoSchema);

// ----------------------------------------------------
// MODELO 3: Fornecedor (CRUD 3) - <<< NOVO >>>
// ----------------------------------------------------
const FornecedorSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    contato: String,
    email: String,
    telefone: String
});
const Fornecedor = mongoose.model('Fornecedor', FornecedorSchema);


// ------------------------------------
// 5. ROTAS DA API (O "CRUD" e o "Login")
// ------------------------------------

// --- Rota de Login (Requisito) ---
app.post('/login', async (req, res) => {
    try {
        const { email, senha } = req.body;
        const usuario = await Usuario.findOne({ email });
        if (!usuario) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }
        const senhaCorreta = await bcrypt.compare(senha, usuario.senha);
        if (!senhaCorreta) {
            return res.status(401).json({ message: 'Senha inválida' });
        }
        const token = jwt.sign(
            { id: usuario._id, email: usuario.email, perfil: usuario.perfil },
            jwtSecret,
            { expiresIn: '1h' }
        );
        res.json({ message: 'Login bem-sucedido', token });
    } catch (error) {
        res.status(500).json({ message: 'Erro no servidor', error: error.message });
    }
});


// -------------------
// --- CRUD 1: Usuários ---
// -------------------
app.post('/usuarios', async (req, res) => { try { const novoUsuario = new Usuario(req.body); await novoUsuario.save(); res.status(201).json(novoUsuario); } catch (error) { res.status(400).json({ message: 'Erro ao criar usuário', error: error.message }); }});
app.get('/usuarios', async (req, res) => { try { const usuarios = await Usuario.find({}, '-senha'); res.json(usuarios); } catch (error) { res.status(500).json({ message: 'Erro ao listar usuários', error: error.message }); }});
app.get('/usuarios/:id', async (req, res) => { try { const usuario = await Usuario.findById(req.params.id, '-senha'); res.json(usuario); } catch (error) { res.status(404).json({ message: 'Usuário não encontrado' }); }});
app.put('/usuarios/:id', async (req, res) => { try { if (req.body.senha) { req.body.senha = await bcrypt.hash(req.body.senha, 10); } const usuario = await Usuario.findByIdAndUpdate(req.params.id, req.body, { new: true }); res.json(usuario); } catch (error) { res.status(400).json({ message: 'Erro ao editar usuário', error: error.message }); }});
app.delete('/usuarios/:id', async (req, res) => { try { await Usuario.findByIdAndDelete(req.params.id); res.json({ message: 'Usuário excluído com sucesso' }); } catch (error) { res.status(404).json({ message: 'Usuário não encontrado' }); }});


// -------------------
// --- CRUD 2: Produtos ---
// -------------------
app.post('/produtos', async (req, res) => { try { const novoProduto = new Produto(req.body); await novoProduto.save(); res.status(201).json(novoProduto); } catch (error) { res.status(400).json({ message: 'Erro ao criar produto', error: error.message }); }});
app.get('/produtos', async (req, res) => { try { const produtos = await Produto.find(); res.json(produtos); } catch (error) { res.status(500).json({ message: 'Erro ao listar produtos', error: error.message }); }});
app.get('/produtos/:id', async (req, res) => { try { const produto = await Produto.findById(req.params.id); res.json(produto); } catch (error) { res.status(404).json({ message: 'Produto não encontrado' }); }});
app.put('/produtos/:id', async (req, res) => { try { const produto = await Produto.findByIdAndUpdate(req.params.id, req.body, { new: true }); res.json(produto); } catch (error) { res.status(400).json({ message: 'Erro ao editar produto', error: error.message }); }});
app.delete('/produtos/:id', async (req, res) => { try { await Produto.findByIdAndDelete(req.params.id); res.json({ message: 'Produto excluído com sucesso' }); } catch (error) { res.status(404).json({ message: 'Produto não encontrado' }); }});

// -------------------
// --- CRUD 3: Fornecedores --- <<< NOVO >>>
// -------------------

// INCLUIR (Create)
app.post('/fornecedores', async (req, res) => {
    try {
        const novoFornecedor = new Fornecedor(req.body);
        await novoFornecedor.save();
        res.status(201).json(novoFornecedor);
    } catch (error) {
        res.status(400).json({ message: 'Erro ao criar fornecedor', error: error.message });
    }
});

// LISTAR (Read)
app.get('/fornecedores', async (req, res) => {
    try {
        const fornecedores = await Fornecedor.find();
        res.json(fornecedores);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao listar fornecedores', error: error.message });
    }
});

// BUSCAR 1 (Read by ID)
app.get('/fornecedores/:id', async (req, res) => {
    try {
        const fornecedor = await Fornecedor.findById(req.params.id);
        res.json(fornecedor);
    } catch (error) {
        res.status(404).json({ message: 'Fornecedor não encontrado' });
    }
});

// EDITAR (Update)
app.put('/fornecedores/:id', async (req, res) => {
    try {
        const fornecedor = await Fornecedor.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(fornecedor);
    } catch (error) {
        res.status(400).json({ message: 'Erro ao editar fornecedor', error: error.message });
    }
});

// EXCLUIR (Delete)
app.delete('/fornecedores/:id', async (req, res) => {
    try {
        await Fornecedor.findByIdAndDelete(req.params.id);
        res.json({ message: 'Fornecedor excluído com sucesso' });
    } catch (error) {
        res.status(404).json({ message: 'Fornecedor não encontrado' });
    }
});


// 6. Iniciar o Servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
