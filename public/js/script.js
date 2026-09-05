const produtosAginaSabores = [
    // --- OPÇÃO ÚNICA DE SALGADOS (POR DÚZIA) ---
    {
        id: 10,
        nome: "Salgados Variados (Dúzia)",
        categoria: "salgados",
        descricao: "Seleção completa dos nossos melhores salgados artesanais. Clique para ver as fotos e escolher o seu tipo preferido por dúzia.",
        precoBase: 350,
        imagens: [
            "imagens/mesasalgados.jpeg",
            "imagens/mesasalgados2.jpeg",
            "imagens/salg1.jpeg",
            "imagens/salg2.jpeg",
            "imagens/salg3.jpeg",
            "imagens/salg4.jpeg",
            "imagens/salg5.jpeg",
            "imagens/salg6.jpeg"
        ],
        opcoes: {
            tamanhos: [
                { nome: "Chamuças de Carne (Dúzia)", preco: 350 },
                { nome: "Chamuças de Caranguejo (Dúzia)", preco: 350 },
                { nome: "Chamuças de Peixe (Dúzia)", preco: 350 },
                { nome: "Chamuças de Frango (Dúzia)", preco: 350 },
                { nome: "Ressóis de Camarão (Dúzia)", preco: 350 },
                { nome: "Spring Roll Vegetais c/ Frango (Dúzia)", preco: 350 },
                { nome: "Almofadinhas Frango e Queijo (Dúzia)", preco: 350 },
                { nome: "Mini Pizza (Dúzia)", preco: 450 },
                { nome: "Stik de Camarão (Dúzia)", preco: 550 }
            ]
        }
    },

    // --- BOLOS DE ANIVERSÁRIO E BOLOS CASEIROS ---
    {
        id: 1,
        nome: "Bolo de Aniversário Decorado",
        categoria: "bolos",
        descricao: "Bolos de aniversário personalizados com acabamento impecável. Selecione a forma/tamanho e o sabor desejado.",
        precoBase: 1350,
        imagens: [
            "imagens/boloaniver.jpeg",
            "imagens/boloaniver1.jpeg",
            "imagens/boloaniver2.jpeg",
            "imagens/boloaniver4.jpeg"
        ],
        opcoes: {
            tamanhos: [
                { nome: "F18 (Forma 18)", preco: 1350 },
                { nome: "F20 (Forma 20)", preco: 1500 },
                { nome: "F22 (Forma 22)", preco: 2500 },
                { nome: "F26 (Forma 26)", preco: 3000 },
                { nome: "F30 (Forma 30)", preco: 3500 },
                { nome: "Bolo Quadrado / Rectangular", preco: 0 }
            ],
            sabores: ["Chocolate", "Red Velvet", "Laranja", "Maracujá", "Caramelo", "Café"]
        }
    },
    {
        id: 2,
        nome: "Bolo Caseiro",
        categoria: "bolos",
        descricao: "Deliciosos bolos caseiros fofinhos e frescos, ideais para o lanche ou ocasiões especiais. Escolha o seu sabor favorito.",
        precoBase: 0, // Preço Sob Consulta
        imagens: [
            "imagens/caseir1.jpeg",
            "imagens/caseir2.jpeg",
            "imagens/caseir3.jpeg",
            "imagens/caseir4.jpeg"
        ],
        opcoes: {
            tamanhos: [
                { nome: "Sabor Chocolate", preco: 0 },
                { nome: "Sabor Maracujá", preco: 0 },
                { nome: "Sabor Ananás", preco: 0 }
            ]
        }
    },

    // --- OPÇÃO ÚNICA DE SOBREMESAS (POR DÚZIA) ---
    {
        id: 20,
        nome: "Sobremesas Artesanais (Dúzia)",
        categoria: "sobremesas",
        descricao: "Deliciosas sobremesas gourmet servidas por dúzia em doses individuais. Escolha a sua opção preferida.",
        precoBase: 1000,
        imagens: [
            "imagens/sobre1.jpeg",
            "imagens/sobre2.jpeg",
            "imagens/mussichoco.jpeg",
            "imagens/colchao.jpeg",
        ],
        opcoes: {
            tamanhos: [
                { nome: "Colchão de Noiva (Dúzia)", preco: 1000 },
                { nome: "Mini Pudim (Dúzia)", preco: 1500 },
                { nome: "Mousse de Chocolate (Dúzia)", preco: 1500 },
                { nome: "Mousse de Maracujá (Dúzia)", preco: 1500 },
                { nome: "Mini Cheesecake de Frutos Vermelhos (Dúzia)", preco: 1850 },
                { nome: "Tiramisu (Dúzia)", preco: 2250 },
                { nome: "Doce de Dubai (Dúzia)", preco: 2250 },
                { nome: "Trílice - Sobremesa Turca (Dúzia)", preco: 2250 }
            ]
        }
    }
];