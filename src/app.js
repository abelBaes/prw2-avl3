import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(express.json());

const authenticateJWT = (req,res,next) => {
    const authHeader = req.header("Authorization");
    console.log("Autorization: " + authHeader);

    let token;

    if(authHeader){
        const parts = authHeader.split(' ');
        if(parts.length === 2) token = parts[1];
    }

    console.log(token);

    if(!token) return res.status(401).json({message: "Acesso negado. Token não fornecido."});

    jwt.verify(token, process.env.JWT_SECRET, (err,user) => {
        if(err){
            if(err.name === "TokenExpiredError") return res.status(401).json({message: "Acesso negado. Token expirado."});
            else if(err.name === "JsonWebTokenError") return res.status(403).json({message: "Acesso negado. Token inválido."});
            else return res.status(403).json({message: "Acesso negado. Erro na verificação do token."});
        }

        req.user = user;

        const issuedAtISO = new Date(user.iat*1000).toISOString();
        const expiresAtISO = new Date(user.exp*1000).toISOString();

        console.log(`Token validado para usuário: ${user.username}
            Emitido em: ${issuedAtISO}
            Expira em: ${expiresAtISO}`);
        
        next(); 
    });
}

const users = [];
const alunos = [
{
    id : 1,
    nome: "Asdrubal",
    ra: 11111,
    nota1: 8.5,
    nota2: 9.5
},
{
    id : 2,
    nome: "Lupita",
    ra: 22222,
    nota1: 7.5,
    nota2: 7
},
{
    id : 3,
    nome: "Zoroastro",
    ra: 33333,
    nota1: 3,
    nota2: 4
}
];

app.post("/register", async(req,res) => {
    const{username,password} = req.body;
    const hashedPassword = await bcrypt.hash(password,10);
    users.push({
        username,
        password: hashedPassword}
    );
    console.log(users);

    res.status(201).json({message: "Usuário criado com sucesso!"});

});

app.post("/login", async(req,res) => {
    const {username, password} = req.body;

    const user = users.find(user => user.username === username);

    if(!user || !(await bcrypt.compare(password,user.password))) return res.status(401).json({ message: "Login Incorreto!"});

    const token = jwt.sign(
        {username: user.username},
        process.env.JWT_SECRET,
        {expiresIn: '1h', algorithm: 'HS256'}
    );

    res.json({message: "Login efetuado com sucesso!",
        jwt: token
    });
});


app.use(authenticateJWT);

function buscarAluno(id){
    return alunos.findIndex( aluno => { return aluno.id === Number(id)});
}

function calcularMedias(){
    const mediaAlunos = [];
    alunos.forEach( aluno => {
        let mediaAluno = ((Number(aluno.nota1) + Number(aluno.nota2))/2);
        mediaAlunos.push({
            nome: aluno.nome,
            media: mediaAluno
        });
    });
    return mediaAlunos;
}

function statusAlunos(){
    const alunosStatus = [];
    alunos.forEach( aluno => {
        let mediaAluno = ((Number(aluno.nota1) + Number(aluno.nota2))/2);
        let statusAluno = mediaAluno >= 6 ? "aprovado" : "reprovado";
        alunosStatus.push({
            nome: aluno.nome,
            status: statusAluno
        });
    });
    return alunosStatus;
}

app.post("/alunos", (req,res) => {
    
    const index = buscarAluno(req.params.id);
    if(index !== -1) return res.status(404).json({message: "Aluno já cadastrado!"});

    alunos.push(req.body);
    res.status(201).json({message: "Aluno cadastrado com sucesso!"}); 
}
);

app.get("/alunos", (req,res) => {
    
    if(alunos.length === 0) return res.status(404).json({message: "Não há nenhum aluno cadastrado"});
    
    res.status(200).json(alunos);
})

app.get("/alunos/medias",(req,res) =>{
    if(alunos.length === 0) return res.status(404).json({message: "Não há nenhum aluno cadastrado"});

    const mediaAlunos = calcularMedias();

    res.status(200).json(mediaAlunos);
});

app.get("/alunos/aprovados",(req,res) =>{
    if(alunos.length === 0) return res.status(404).json({message: "Não há nenhum aluno cadastrado"});

    const alunosAprovados = statusAlunos();

    res.status(200).json(alunosAprovados);
});

app.get("/alunos/:id", (req,res) => {
    if(alunos.length === 0) return res.status(404).json({message: "Não há nenhum aluno cadastrado"});
    
    const index = buscarAluno(req.params.id);
    if(index === -1) return res.status(404).json({message: "Aluno não cadastrado!"});

    res.status(200).json(alunos[index]);
});

app.put("/alunos/:id", (req,res) => {
    if(alunos.length === 0) return res.status(404).json({message: "Não há nenhum aluno cadastrado"});
    
    const index = buscarAluno(req.params.id);
    if(index === -1) return res.status(404).json({message: "Aluno não cadastrado!"});

    alunos[index].nome = req.body.nome;
    alunos[index].ra = req.body.ra;
    alunos[index].nota1 = req.body.nota1;
    alunos[index].nota2 = req.body.nota2;

    res.status(200).json({message: "Aluno alterado com sucesso!"});
});

app.delete("/alunos/:id", (req,res) => {
    if(alunos.length === 0) return res.status(404).json({message: "Não há nenhum aluno cadastrado"});
    
    const index = buscarAluno(req.params.id);
    if(index === -1) return res.status(404).json({message: "Aluno não cadastrado!"});

    alunos.splice(index, 1);

    res.status(200).json({messege: "Aluno removido com sucesso!"});
});

export default app;