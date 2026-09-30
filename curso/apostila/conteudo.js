// Gerado a partir das videoaulas do Treinamento de Operações de Estoque (prints + narração).
window.APOSTILA = {
 "area_id": "estoque",
 "area_nome": "Operações de Estoque",
 "modulos": [
  {
   "id": "recebimento",
   "ordem": 1,
   "nome": "Recebimento de Mercadoria",
   "duracao": "11:19",
   "accent": "#2dd4bf",
   "objetivo": "Dar entrada, no **BTA**, nos volumes que chegam do CD ou de um remanejo, conferindo **par a par** o que veio dentro de cada caixa antes de receber. Assim o estoque da loja fica igual ao físico e toda falta, sobra ou produto trocado é registrado na hora.",
   "quando": [
    "Sempre que o caminhão entregar volumes na loja (reposição do CD ou remanejo de outra loja).",
    "O procedimento é o mesmo para CD e remanejo; muda apenas o conteúdo das caixas."
   ],
   "antes": [
    "Tenha em mãos o **papel da Expedição** entregue com a mercadoria.",
    "Separe todas as caixas (volumes) e o leitor de código de barras. **Não é permitido digitar** códigos: tudo é bipado."
   ],
   "atencao": [
    "**Nunca digite** o código: o sistema só aceita leitura pelo leitor (\"Não é permitido digitar, bipe o produto usando o leitor de código de barras!\").",
    "Confira os pares **antes** de receber. Receber e conferir depois é procedimento errado e esconde divergência.",
    "Motivo sem diferença (linha bipada) **não ajusta nada** no sistema.",
    "Falta, sobra ou produto intruso deve ser comunicado ao **gestor** e à **Auditoria/Controladoria**.",
    "Mensagem de erro aberta: clique em **OK** antes de bipar o próximo par."
   ],
   "checklist": [
    "Papel da Expedição em mãos e caixas separadas",
    "Expedição bipada em Expedição → Receber",
    "Cada volume bipado e todos os pares conferidos",
    "Diferença zerada ou motivo informado (falta / sobra / intruso)",
    "Receber Total ou Receber Parcial",
    "Etiquetas OLA impressas (mercadoria do CD)",
    "Todos os volumes verdes/amarelos e Finalizar",
    "Divergências comunicadas ao gestor e à Auditoria"
   ],
   "passos": [
    {
     "t": 13,
     "titulo": "Abra o BTA e entre em Expedição → Receber",
     "texto": [
      "No **Controle Remanejo Loja**, clique na aba **Expedição** e depois no botão **Receber**."
     ],
     "imgs": [
      {
       "arq": "01.jpg",
       "destaques": [
        {
         "x": 27.36,
         "y": 11.67,
         "w": 10.38,
         "h": 6.67,
         "rotulo": "1"
        },
        {
         "x": 4.72,
         "y": 28.33,
         "w": 87.74,
         "h": 7.67,
         "rotulo": "2 · Receber"
        }
       ]
      }
     ]
    },
    {
     "t": 34,
     "titulo": "Localize a expedição no papel",
     "texto": [
      "O papel da Expedição traz o **número da expedição**, a lista de volumes, o **total de volumes** e o **total de itens**. É o **código de barras** dele que você vai bipar."
     ],
     "imgs": [
      {
       "arq": "02.jpg",
       "destaques": [
        {
         "x": 31.48,
         "y": 2.27,
         "w": 34.26,
         "h": 5.68,
         "rotulo": "Nº da expedição"
        },
        {
         "x": 70.37,
         "y": 13.07,
         "w": 25.0,
         "h": 9.09,
         "rotulo": "bipe este código"
        },
        {
         "x": 0.93,
         "y": 58.52,
         "w": 31.48,
         "h": 7.95,
         "rotulo": "totais"
        }
       ]
      }
     ]
    },
    {
     "t": 43,
     "titulo": "Bipe a expedição",
     "texto": [
      "Na tela **Receber Expedição**, bipe o código do papel. Aparecem os volumes da expedição em **vermelho**: vermelho = volume ainda não conferido.",
      "Uma expedição do CD normalmente tem vários volumes, um ao lado do outro."
     ],
     "imgs": [
      {
       "arq": "03.jpg",
       "destaques": [
        {
         "x": 20.33,
         "y": 14.3,
         "w": 14.07,
         "h": 3.95,
         "rotulo": "expedição bipada"
        },
        {
         "x": 20.99,
         "y": 21.4,
         "w": 16.26,
         "h": 30.47,
         "rotulo": "volume pendente"
        }
       ]
      }
     ]
    },
    {
     "t": 101,
     "titulo": "Encontre a etiqueta de cada caixa",
     "texto": [
      "Cada caixa tem uma etiqueta de volume (azul ou amarela). O **número do volume** aparece embaixo do código de barras e também no quadrado vermelho do sistema.",
      "Separe as caixas e **bipe uma a uma** para fazer o recebimento."
     ],
     "imgs": [
      {
       "arq": "04.jpg",
       "destaques": [
        {
         "x": 28.12,
         "y": 50.0,
         "w": 56.25,
         "h": 13.07,
         "rotulo": "código do volume"
        }
       ],
       "retrato": true
      }
     ]
    },
    {
     "t": 131,
     "titulo": "Bipe o volume e confira os produtos da caixa",
     "texto": [
      "Ao bipar a etiqueta da caixa abre a lista do que **deveria** estar dentro dela. Confira as colunas:",
      "**Qtde** = o que tem que ter na caixa · **Qtde Lida** = o que você bipou · **Diferença** = controle (tem que zerar).",
      "Bipe **todos os pares** que estão na caixa no campo **Código de Barras**."
     ],
     "imgs": [
      {
       "arq": "05.jpg",
       "destaques": [
        {
         "x": 20.3,
         "y": 10.94,
         "w": 14.7,
         "h": 8.59,
         "rotulo": "bipe cada par"
        },
        {
         "x": 71.5,
         "y": 18.75,
         "w": 17.0,
         "h": 39.06,
         "rotulo": "Qtde · Lida · Diferença"
        }
       ]
      }
     ]
    },
    {
     "t": 166,
     "titulo": "Tudo batendo: aparece o ✔",
     "texto": [
      "Quando a quantidade lida bate com a esperada, a diferença de todos os tamanhos fica **0** e o sistema mostra o sinal de **OK**. Nesse caso é só usar **Receber Total**."
     ],
     "imgs": [
      {
       "arq": "06.jpg",
       "destaques": [
        {
         "x": 83.0,
         "y": 12.44,
         "w": 5.5,
         "h": 25.91,
         "rotulo": "diferença 0"
        },
        {
         "x": 2.0,
         "y": 70.47,
         "w": 11.0,
         "h": 14.51,
         "rotulo": "OK"
        },
        {
         "x": 0.3,
         "y": 11.61,
         "w": 11.0,
         "h": 4.35,
         "rotulo": "Receber Total"
        }
       ]
      }
     ]
    },
    {
     "t": 191,
     "titulo": "Bipou errado? Use F7 para Retirar",
     "texto": [
      "A tecla **F7** alterna o botão entre **Adicionar** e **Retirar**. Em **Retirar**, bipe o par que foi lido a mais para tirá-lo da contagem; aperte **F7** de novo para voltar a **Adicionar**.",
      "Por isso é importante **conferir antes de receber**: se você bipar errado e não corrigir, a divergência não vai ser identificada."
     ],
     "imgs": [
      {
       "arq": "07.jpg",
       "destaques": [
        {
         "x": 34.5,
         "y": 10.62,
         "w": 6.5,
         "h": 5.94,
         "rotulo": "Retirar (F7)"
        }
       ]
      }
     ]
    },
    {
     "t": 255,
     "titulo": "Divergência de verdade: informe o Motivo",
     "texto": [
      "Se depois de conferir a caixa a diferença continuar, escolha o **Motivo** na linha do produto:",
      "Diferença **-1** (veio a menos) = **Falta de item** · Diferença **+1** (veio a mais) = **Sobra de item**. A lista também tem grade diferente, cor diferente, pé trocado, produto com defeito, sujo, manchado etc."
     ],
     "imgs": [
      {
       "arq": "08.jpg",
       "destaques": [
        {
         "x": 83.0,
         "y": 39.38,
         "w": 5.0,
         "h": 9.06,
         "rotulo": "diferença"
        },
        {
         "x": 88.2,
         "y": 41.09,
         "w": 9.2,
         "h": 46.88,
         "rotulo": "Motivo"
        }
       ]
      }
     ]
    },
    {
     "t": 303,
     "titulo": "Produto que não é da caixa (intruso)",
     "texto": [
      "Se você bipar um par que não pertence ao volume aparece: **\"Produto não deveria estar no volume, verifique!\"**. Clique em **OK** antes de bipar qualquer outra coisa. Se bipar outro produto com a mensagem aberta, a tela fecha e aquele par **não é computado**.",
      "O intruso entra em **vermelho** no fim da lista, como sobra. Conte de novo e avise o **gestor** e a **Auditoria/Controladoria** para verificarem por que o produto chegou a mais (ou a menos)."
     ],
     "imgs": [
      {
       "arq": "09.jpg",
       "destaques": [
        {
         "x": 38.2,
         "y": 64.06,
         "w": 24.8,
         "h": 31.25,
         "rotulo": "clique em OK"
        }
       ]
      },
      {
       "arq": "10.jpg",
       "destaques": [
        {
         "x": 12.0,
         "y": 56.72,
         "w": 84.5,
         "h": 5.62,
         "rotulo": "intruso = sobra"
        }
       ]
      }
     ]
    },
    {
     "t": 419,
     "titulo": "Motivo sem divergência não ajusta nada",
     "texto": [
      "Se o par veio **trocado, sujo ou com defeito** e mesmo assim você **bipou**, o sistema entende que está tudo OK, **mesmo que você escolha um motivo**. Primeiro gere a divergência (retire o par com F7, deixando a linha em vermelho) e só então informe o motivo.",
      "Ordem certa: **bipa o volume → confere os pés → dá baixa**. Nunca receba a nota para conferir depois."
     ],
     "dica": "Motivo só vale para linha com diferença. Linha sem diferença = sem divergência."
    },
    {
     "t": 536,
     "titulo": "Receber Parcial (quando há divergência)",
     "texto": [
      "Com falta, sobra ou intruso informados, clique em **Receber Parcial**. O sistema pede confirmação: **\"Para prosseguir com o recebimento parcial, selecione o motivo da divergência para cada item\"**. Responda **Sim**."
     ],
     "imgs": [
      {
       "arq": "11.jpg",
       "destaques": [
        {
         "x": 0.3,
         "y": 25.31,
         "w": 11.0,
         "h": 6.56,
         "rotulo": "Receber Parcial"
        },
        {
         "x": 36.2,
         "y": 63.75,
         "w": 28.6,
         "h": 32.19,
         "rotulo": "Sim"
        }
       ]
      }
     ]
    },
    {
     "t": 559,
     "titulo": "Imprimir as etiquetas OLA",
     "texto": [
      "Em seguida ele pergunta se deseja **imprimir as etiquetas OLA** (os códigos dos produtos). **Na loja, responda Sim**: as etiquetas saem na impressora de etiquetas (Argox/Elgin) para selar os produtos que chegaram.",
      "No **remanejo** não é preciso tirar etiqueta, porque o produto já vem etiquetado da outra loja."
     ],
     "imgs": [
      {
       "arq": "12.jpg",
       "destaques": [
        {
         "x": 35.5,
         "y": 64.06,
         "w": 30.0,
         "h": 31.25,
         "rotulo": "loja: Sim"
        }
       ]
      }
     ]
    },
    {
     "t": 578,
     "titulo": "Volume amarelo = recebido com divergência",
     "texto": [
      "O volume fica **amarelo** quando foi recebido parcialmente. Se você perceber que a divergência foi um erro de leitura, bipe o volume de novo, ajuste com F7 (retirar/adicionar) até a diferença zerar e use **Receber Total**."
     ],
     "imgs": [
      {
       "arq": "13.jpg",
       "destaques": [
        {
         "x": 20.99,
         "y": 21.4,
         "w": 16.26,
         "h": 30.47,
         "rotulo": "com divergência"
        }
       ]
      }
     ]
    },
    {
     "t": 668,
     "titulo": "Volume verde e Finalizar",
     "texto": [
      "Com todos os volumes **verdes** (ou amarelos já tratados), clique em **Finalizar**. A nota é fechada e a mercadoria entra no estoque da loja."
     ],
     "imgs": [
      {
       "arq": "14.jpg",
       "destaques": [
        {
         "x": 20.99,
         "y": 21.63,
         "w": 16.04,
         "h": 30.23,
         "rotulo": "recebido"
        },
        {
         "x": 7.47,
         "y": 16.28,
         "w": 12.09,
         "h": 4.42,
         "rotulo": "Finalizar"
        }
       ]
      }
     ]
    }
   ]
  },
  {
   "id": "notas-fiscais",
   "ordem": 2,
   "nome": "Notas Fiscais",
   "duracao": "11:39",
   "accent": "#38bdf8",
   "objetivo": "Gerar e imprimir, no **SETA (Retaguarda)**, a nota fiscal da transferência que você montou (remanejo, defeito ou devolução), com a **transportadora RL** e a **quantidade de volumes** corretas. Também mostra como **reimprimir** uma nota que não saiu.",
   "quando": [
    "Depois de fechar os volumes, imprimir os rótulos e fazer o **checkout da expedição**.",
    "Vale para toda nota enviada: remanejo, defeito, devolução ao CD ou devolução para outra loja."
   ],
   "antes": [
    "Tenha em mãos o **papel da Expedição** (número da expedição, quantidade de volumes e de itens)."
   ],
   "atencao": [
    "Transportadora é **sempre RL**. Nunca emita sem preencher o F7 - Transportador.",
    "A **quantidade de volumes** da nota tem que ser igual à do papel da Expedição.",
    "Confira o **número da expedição** nas Observações antes de clicar em Enviar.",
    "Na consulta de NF-e, mude o **status primeiro** e a **data depois** (a data volta para 2024).",
    "Só feche a tela de impressão depois de ver a nota impressa."
   ],
   "checklist": [
    "Papel da Expedição em mãos",
    "SETA → Retaguarda → TR → Pesquisar (Enviadas + Pendentes)",
    "Transferência com nota em branco aberta (2 cliques)",
    "Nº da expedição conferido e Enviar com usuário/senha",
    "F7 - Transportador: RL, quantidade de volumes e espécie VOLUME",
    "F8 - Emitir e nota impressa",
    "Número da NF anotado na placa do volume"
   ],
   "passos": [
    {
     "t": 51,
     "titulo": "Abra o SETA e entre na Retaguarda",
     "texto": [
      "Entre no **SETA** com o usuário da sua loja e clique em **5 : Retaguarda**."
     ],
     "imgs": [
      {
       "arq": "01.jpg",
       "destaques": [
        {
         "x": 67.66,
         "y": 45.0,
         "w": 13.75,
         "h": 29.17,
         "rotulo": "Retaguarda"
        }
       ]
      }
     ]
    },
    {
     "t": 12,
     "titulo": "Confira o papel da Expedição",
     "texto": [
      "O número da expedição desse papel é o que vai aparecer na transferência. A quantidade de volumes dele é a que vai na nota."
     ],
     "imgs": [
      {
       "arq": "02.jpg",
       "destaques": [
        {
         "x": 31.48,
         "y": 2.27,
         "w": 34.26,
         "h": 5.68,
         "rotulo": "Nº da expedição"
        },
        {
         "x": 0.93,
         "y": 58.52,
         "w": 31.48,
         "h": 7.95,
         "rotulo": "volumes / itens"
        }
       ]
      }
     ]
    },
    {
     "t": 76,
     "titulo": "Clique em TR e depois em Pesquisar",
     "texto": [
      "Na barra lateral, clique no ícone **TR** (Transferências de produtos entre filiais). Na tela que abre, clique em **5 - Pesquisar**."
     ],
     "imgs": [
      {
       "arq": "03.jpg",
       "destaques": [
        {
         "x": -3.48,
         "y": 41.97,
         "w": 3.26,
         "h": 6.22,
         "rotulo": "TR"
        },
        {
         "x": 8.48,
         "y": 27.98,
         "w": 12.5,
         "h": 3.42,
         "rotulo": "Pesquisar"
        }
       ]
      }
     ]
    },
    {
     "t": 97,
     "titulo": "Filtre: Transf. Enviadas + Pendentes",
     "texto": [
      "Em **Localizar transferência**, deixe marcado **Transf. Enviadas** e status **Pendentes** (já vêm assim) e clique em **Filtrar**.",
      "Recebidas/Canceladas servem só para consultar o que aconteceu com uma nota antiga."
     ],
     "imgs": [
      {
       "arq": "04.jpg",
       "destaques": [
        {
         "x": 24.35,
         "y": 35.75,
         "w": 10.33,
         "h": 11.4,
         "rotulo": "Enviadas + Pendentes"
        },
        {
         "x": 24.35,
         "y": 22.18,
         "w": 6.52,
         "h": 3.63,
         "rotulo": "Filtrar"
        }
       ]
      }
     ]
    },
    {
     "t": 131,
     "titulo": "Abra a transferência com a nota em branco",
     "texto": [
      "Toda transferência nova aparece com a coluna **Nota Fiscal em branco**: é essa que você vai gerar. Dê **dois cliques** nela."
     ],
     "imgs": [
      {
       "arq": "05.jpg",
       "destaques": [
        {
         "x": 36.41,
         "y": 25.49,
         "w": 36.96,
         "h": 3.11,
         "rotulo": "nota em branco"
        }
       ]
      }
     ]
    },
    {
     "t": 176,
     "titulo": "Confira a expedição e clique em Enviar",
     "texto": [
      "Aparecem os produtos da transferência. Em **Observações** confira se o **número da expedição** é o mesmo do papel. Origem e destino já vêm preenchidos: **não mexa**.",
      "Bateu? Clique em **Enviar** e informe seu **usuário e senha**."
     ],
     "imgs": [
      {
       "arq": "06.jpg",
       "destaques": [
        {
         "x": 22.28,
         "y": 88.6,
         "w": 16.3,
         "h": 4.15,
         "rotulo": "nº da expedição"
        },
        {
         "x": 78.8,
         "y": 15.75,
         "w": 9.78,
         "h": 3.73,
         "rotulo": "Enviar"
        }
       ]
      },
      {
       "arq": "07.jpg",
       "destaques": [
        {
         "x": 30.0,
         "y": 37.82,
         "w": 40.0,
         "h": 25.91,
         "rotulo": "usuário e senha"
        }
       ]
      }
     ]
    },
    {
     "t": 261,
     "titulo": "NÃO emita ainda: primeiro F7 - Transportador",
     "texto": [
      "Na tela **Impressão de Notas Fiscais**, **não clique em Emitir primeiro**. Clique antes em **F7 - Transportador**.",
      "Na janela **Transportador/Volumes** preencha a **Transportadora**, a **Quantidade** de volumes (fez 6 volumes = 6; um volume só = 1) e a **Espécie: VOLUME**."
     ],
     "imgs": [
      {
       "arq": "08.jpg",
       "destaques": [
        {
         "x": 9.24,
         "y": 14.51,
         "w": 9.78,
         "h": 3.32,
         "rotulo": "F7 - Transportador"
        },
        {
         "x": 44.02,
         "y": 35.54,
         "w": 21.74,
         "h": 3.52,
         "rotulo": "Transportadora"
        },
        {
         "x": 44.02,
         "y": 52.33,
         "w": 10.87,
         "h": 7.77,
         "rotulo": "Qtde + Espécie"
        }
       ]
      }
     ]
    },
    {
     "t": 305,
     "titulo": "Transportadora: digite RL e dê Enter",
     "texto": [
      "Na lupa da transportadora abre o cadastro com várias empresas. Digite **RL** no campo de busca e dê **Enter**: aparece só a transportadora correta. Selecione, dê **Enter** e **OK**.",
      "**Sempre RL**, em qualquer nota: remanejo, defeito, devolução para loja ou para o CD."
     ],
     "imgs": [
      {
       "arq": "09.jpg",
       "destaques": [
        {
         "x": 29.89,
         "y": 74.82,
         "w": 26.63,
         "h": 3.52,
         "rotulo": "digite RL + Enter"
        }
       ]
      }
     ]
    },
    {
     "t": 395,
     "titulo": "Agora sim: F8 - Emitir",
     "texto": [
      "Com transportadora e volumes preenchidos, clique em **F8 - Emitir**. Se perguntar que o campo de informações complementares está vazio, responda **Sim**."
     ],
     "imgs": [
      {
       "arq": "10.jpg",
       "destaques": [
        {
         "x": 9.24,
         "y": 11.71,
         "w": 9.78,
         "h": 3.32,
         "rotulo": "F8 - Emitir"
        },
        {
         "x": 34.02,
         "y": 42.49,
         "w": 32.39,
         "h": 20.21,
         "rotulo": "Sim"
        }
       ]
      }
     ]
    },
    {
     "t": 413,
     "titulo": "Anote o número e imprima",
     "texto": [
      "A nota é transmitida e abre o **Log Documentos Eletrônicos** com o **número da nota fiscal**. Clique em **Imprimir**, escolha a impressora da loja e imprima."
     ],
     "imgs": [
      {
       "arq": "11.jpg",
       "destaques": [
        {
         "x": 33.15,
         "y": 32.64,
         "w": 22.83,
         "h": 3.63,
         "rotulo": "nº da nota"
        },
        {
         "x": 22.07,
         "y": 33.99,
         "w": 9.57,
         "h": 3.11,
         "rotulo": "Imprimir"
        }
       ]
      }
     ]
    },
    {
     "t": 441,
     "titulo": "Reimprimir: Fiscal → Consulta Nota Fiscal Eletrônica",
     "texto": [
      "A nota não saiu na impressora e a tela foi fechada? No SETA, abra o menu **Fiscal → Consulta Nota Fiscal Eletrônica**."
     ],
     "imgs": [
      {
       "arq": "12.jpg",
       "destaques": [
        {
         "x": 19.57,
         "y": 3.11,
         "w": 3.48,
         "h": 3.11,
         "rotulo": "Fiscal"
        },
        {
         "x": 20.11,
         "y": 10.98,
         "w": 18.48,
         "h": 3.01,
         "rotulo": "Consulta NF-e"
        }
       ]
      }
     ]
    },
    {
     "t": 484,
     "titulo": "Ajuste o status e depois a data",
     "texto": [
      "Mude o **Status** (a nota já foi enviada; na dúvida use **Todos**). **Só depois** ajuste a **Data Inicial/Final**: toda vez que muda o status, a data volta para 2024. Se tiver o número da nota ou a TRF, pode filtrar por ele.",
      "Clique em **F8 - Filtrar**."
     ],
     "imgs": [
      {
       "arq": "13.jpg",
       "destaques": [
        {
         "x": 48.91,
         "y": 45.6,
         "w": 16.3,
         "h": 3.32,
         "rotulo": "Status (1º)"
        },
        {
         "x": 48.91,
         "y": 51.09,
         "w": 8.7,
         "h": 5.8,
         "rotulo": "Datas (2º)"
        },
        {
         "x": 29.35,
         "y": 33.47,
         "w": 6.52,
         "h": 3.11,
         "rotulo": "Filtrar"
        }
       ]
      }
     ]
    },
    {
     "t": 591,
     "titulo": "Localize a nota pela hora e abra",
     "texto": [
      "Aparecem as notas do período. Se fez mais de uma no dia, identifique pela **hora** e pela quantidade. Selecione e clique em **Abrir NFE**."
     ],
     "imgs": [
      {
       "arq": "14.jpg",
       "destaques": [
        {
         "x": 22.83,
         "y": 12.85,
         "w": 66.3,
         "h": 6.63,
         "rotulo": "notas do dia"
        },
        {
         "x": 10.33,
         "y": 13.06,
         "w": 6.52,
         "h": 3.11,
         "rotulo": "Abrir NFE"
        }
       ]
      }
     ]
    },
    {
     "t": 621,
     "titulo": "Confira a transportadora e emita de novo",
     "texto": [
      "A nota abre na mesma tela. Se a transportadora estiver errada, corrija para **RL** em F7. Clique em **F8 - Emitir** e imprima.",
      "**Não feche a tela** até conferir que a nota saiu na impressora. Se fechar, terá que fazer a consulta de novo."
     ],
     "imgs": [
      {
       "arq": "15.jpg",
       "destaques": [
        {
         "x": 44.35,
         "y": 35.54,
         "w": 20.65,
         "h": 3.52,
         "rotulo": "tem que ser RL"
        }
       ]
      }
     ]
    }
   ]
  },
  {
   "id": "fazer-etiquetas",
   "ordem": 3,
   "nome": "Emitir Etiquetas",
   "duracao": "06:09",
   "accent": "#fb923c",
   "objetivo": "Gerar e imprimir, no **SETA**, as etiquetas de código de barras dos produtos (etiquetas avulsas) na impressora de etiquetas da loja, escolhendo o tipo e o modelo corretos.",
   "quando": [
    "Produto sem etiqueta, etiqueta rasurada, ilegível ou com código errado.",
    "Reposição de etiquetas de produtos da loja (por tamanho ou para toda a grade)."
   ],
   "antes": [
    "Tenha o **código do produto** (ou use a lupa para pesquisar por marca/descrição).",
    "Confira se a impressora de etiquetas está ligada e com etiquetas."
   ],
   "atencao": [
    "Confira **código, cor e tamanho** antes de imprimir: etiqueta errada gera divergência no caixa e no estoque.",
    "Use **Etiquetas Avulsas** para produtos da loja; **Etiquetas das Compras** é pelo código da compra.",
    "Etiqueta rasurada ou falhada deve ser **reimpressa**, nunca aproveitada.",
    "Sempre **limpe o arquivo de etiquetas** ao terminar."
   ],
   "checklist": [
    "Estoque → Gerar Etiquetas de Produtos → Etiquetas Avulsas",
    "Código do produto (ou lupa) e nº de etiquetas",
    "Produto enviado para a lista (Imprimir)",
    "Impressora, Etiqueta Adesiva e modelo conferidos",
    "Modelo da etiqueta → Ok",
    "Etiquetas conferidas (tamanho = par)",
    "Arquivo de etiquetas limpo (Sim)"
   ],
   "passos": [
    {
     "t": 16,
     "titulo": "Estoque → Gerar Etiquetas de Produtos",
     "texto": [
      "No SETA (Retaguarda), abra o menu **Estoque** e clique em **Gerar Etiquetas de Produtos**."
     ],
     "imgs": [
      {
       "arq": "01.jpg",
       "destaques": [
        {
         "x": 10.11,
         "y": 3.21,
         "w": 4.02,
         "h": 2.9,
         "rotulo": "Estoque"
        },
        {
         "x": 10.11,
         "y": 46.63,
         "w": 26.09,
         "h": 3.11,
         "rotulo": "Gerar Etiquetas de Produtos"
        }
       ]
      }
     ]
    },
    {
     "t": 22,
     "titulo": "Escolha a aba Etiquetas Avulsas",
     "texto": [
      "A tela abre em **Etiquetas das Compras** (usada com o código da compra). Para etiquetar produtos da loja, clique em **Etiquetas Avulsas**."
     ],
     "imgs": [
      {
       "arq": "02.jpg",
       "destaques": [
        {
         "x": 55.98,
         "y": 33.16,
         "w": 18.48,
         "h": 3.52,
         "rotulo": "Etiquetas Avulsas"
        }
       ]
      }
     ]
    },
    {
     "t": 60,
     "titulo": "Informe o produto e a quantidade",
     "texto": [
      "Em **Código do Produto**, digite o código com o tamanho (ex.: 007421-39) ou use a **lupa** para pesquisar. Confira a descrição, a cor e a referência que aparecem.",
      "Informe o **Nº de Etiquetas**. Para gerar etiquetas de **todos os tamanhos** conforme o estoque, marque **\"Gerar etiquetas para todas as grades do produto\"**.",
      "Clique em **Imprimir** para mandar o produto para a lista de impressão."
     ],
     "imgs": [
      {
       "arq": "03.jpg",
       "destaques": [
        {
         "x": 48.15,
         "y": 41.97,
         "w": 9.24,
         "h": 3.32,
         "rotulo": "código"
        },
        {
         "x": 48.15,
         "y": 60.73,
         "w": 7.61,
         "h": 3.32,
         "rotulo": "nº etiquetas"
        },
        {
         "x": 47.83,
         "y": 65.49,
         "w": 20.11,
         "h": 4.97,
         "rotulo": "todas as grades"
        },
        {
         "x": 25.87,
         "y": 35.03,
         "w": 6.3,
         "h": 3.32,
         "rotulo": "Imprimir"
        }
       ]
      }
     ]
    },
    {
     "t": 245,
     "titulo": "Não sabe o código? Pesquise pela lupa",
     "texto": [
      "A lupa abre a **Pesquisa de produtos**. Filtre pela **Marca** (ou descrição, referência) e clique em **F8 - Filtrar**. À direita aparecem os **tamanhos e quantidades** em estoque do produto selecionado."
     ],
     "imgs": [
      {
       "arq": "04.jpg",
       "destaques": [
        {
         "x": 10.33,
         "y": 52.64,
         "w": 12.5,
         "h": 3.32,
         "rotulo": "Marca"
        },
        {
         "x": 10.33,
         "y": 10.05,
         "w": 7.07,
         "h": 3.11,
         "rotulo": "F8 - Filtrar"
        },
        {
         "x": 76.63,
         "y": 11.19,
         "w": 11.96,
         "h": 20.73,
         "rotulo": "tamanhos"
        }
       ]
      }
     ]
    },
    {
     "t": 108,
     "titulo": "Confira a lista e as opções de impressão",
     "texto": [
      "Na **Impressão de Etiquetas de Produtos** confira os produtos, tamanhos e quantidades. Selecione a **impressora** da loja, o tipo **Etiqueta Adesiva** e o modelo (**A - Uma com Preço**, B - Uma sem Preço etc.).",
      "Clique em **Imprimir**."
     ],
     "imgs": [
      {
       "arq": "05.jpg",
       "destaques": [
        {
         "x": 27.17,
         "y": 22.59,
         "w": 55.43,
         "h": 16.79,
         "rotulo": "produtos"
        },
        {
         "x": 14.57,
         "y": 40.73,
         "w": 10.33,
         "h": 3.52,
         "rotulo": "impressora"
        },
        {
         "x": 14.57,
         "y": 53.68,
         "w": 10.33,
         "h": 7.05,
         "rotulo": "tipo"
        },
        {
         "x": 14.57,
         "y": 64.04,
         "w": 11.41,
         "h": 13.47,
         "rotulo": "modelo"
        },
        {
         "x": 14.57,
         "y": 21.76,
         "w": 6.52,
         "h": 3.32,
         "rotulo": "Imprimir"
        }
       ]
      }
     ]
    },
    {
     "t": 168,
     "titulo": "Selecione o modelo da etiqueta e dê OK",
     "texto": [
      "Em **Modelo da Etiqueta**, escolha o modelo da impressora da loja e clique em **Ok**."
     ],
     "imgs": [
      {
       "arq": "06.jpg",
       "destaques": [
        {
         "x": 42.17,
         "y": 52.02,
         "w": 24.24,
         "h": 3.42,
         "rotulo": "modelo"
        },
        {
         "x": 30.87,
         "y": 48.08,
         "w": 8.91,
         "h": 3.42,
         "rotulo": "Ok"
        }
       ]
      }
     ]
    },
    {
     "t": 184,
     "titulo": "Confira as etiquetas impressas",
     "texto": [
      "Cada etiqueta sai com **código de barras, descrição, marca, cor e tamanho**. Confira se o tamanho da etiqueta é o mesmo do par antes de colar."
     ],
     "imgs": [
      {
       "arq": "07.jpg",
       "destaques": [],
       "retrato": true
      }
     ]
    },
    {
     "t": 223,
     "titulo": "Limpe o arquivo de etiquetas",
     "texto": [
      "Depois de imprimir, o sistema pergunta **\"Deseja limpar o arquivo de etiquetas?\"**. Responda **Sim** para a próxima impressão não repetir as etiquetas antigas."
     ],
     "imgs": [
      {
       "arq": "08.jpg",
       "destaques": [
        {
         "x": 38.59,
         "y": 42.49,
         "w": 23.04,
         "h": 20.31,
         "rotulo": "Sim"
        }
       ]
      }
     ]
    }
   ]
  },
  {
   "id": "fechamento-de-volumes",
   "ordem": 4,
   "nome": "Fechamento de Volume",
   "duracao": "13:10",
   "accent": "#a78bfa",
   "objetivo": "Fechar e identificar corretamente as caixas que saem da loja (remanejo, defeito, devolução ao fornecedor e devolução para loja), para que a mercadoria viaje protegida e seja reconhecida pelo CD e pela loja de destino.",
   "quando": [
    "Depois de montar o volume no BTA, com a caixa cheia e conferida."
   ],
   "antes": [
    "Separe **fita**, **estilete/tesoura**, **caneta**, os **rótulos** impressos (4 ou 5 por caixa) e a **placa** certa.",
    "Placa preenchida com **visto do gerente**, origem, destino, nota fiscal, volume e data."
   ],
   "atencao": [
    "Caixa **sem abertura** e sem folga: produto solto amassa ou se perde no transporte.",
    "Placa certa para cada tipo de envio, com **visto do gerente**.",
    "**Número da NF, volume (ex.: 2/5) e data** preenchidos na placa.",
    "Rótulos antigos de outra loja ou do CD devem ser **retirados, cobertos ou rasurados**.",
    "Rótulo falhado ou rasurado: **reimprima**."
   ],
   "checklist": [
    "Caixa cheia, conferida e sem folga (diminuída se precisar)",
    "Fita em volta de toda a caixa e laterais reforçadas",
    "Placa certa (Remanejo / Defeito / Devolução Fornecedor / Devolução Loja)",
    "Visto do gerente, destino, NF, volume e data preenchidos",
    "Placa colada na frente (ou em cima, se a caixa for pequena)",
    "4 ou 5 rótulos colados (placa, laterais, tampa, traseira)",
    "Rótulos e placas antigas retirados, cobertos ou rasurados",
    "Devolução para loja: folha de motivos colada e marcada"
   ],
   "passos": [
    {
     "t": 5,
     "titulo": "Feche a caixa com fita",
     "texto": [
      "Com a caixa cheia e tudo conferido, feche passando fita **em volta de toda a caixa**. Não pode ficar abertura nem parte mole por onde a mercadoria saia. Os produtos devem ficar firmes dentro da caixa para não amassar no transporte."
     ],
     "imgs": [
      {
       "arq": "01.jpg",
       "destaques": [],
       "retrato": true
      },
      {
       "arq": "02.jpg",
       "destaques": [],
       "retrato": true
      }
     ]
    },
    {
     "t": 72,
     "titulo": "Reforce as laterais",
     "texto": [
      "Dependendo da caixa, passe fita também nas **laterais** e nos cantos para reforçar. Caixa mais mole precisa de mais reforço."
     ],
     "imgs": [
      {
       "arq": "03.jpg",
       "destaques": [],
       "retrato": true
      },
      {
       "arq": "04.jpg",
       "destaques": [],
       "retrato": true
      }
     ]
    },
    {
     "t": 116,
     "titulo": "Caixa grande demais? Diminua a caixa",
     "texto": [
      "Se o produto fica **folgado** (caixa maior que o produto), diminua a caixa: passe o **estilete nas quinas laterais** na altura do produto, dobre as abas para dentro e feche de novo com fita (em cima, embaixo e no meio).",
      "Caixa na medida protege o produto e não amassa na entrega."
     ],
     "imgs": [
      {
       "arq": "05.jpg",
       "destaques": [],
       "retrato": true
      },
      {
       "arq": "06.jpg",
       "destaques": [],
       "retrato": true
      }
     ]
    },
    {
     "t": 240,
     "titulo": "Conheça as placas",
     "texto": [
      "**Remanejo:** destino **R1** já impresso; você escreve só a loja de destino. **Defeito** e **Devolução ao Fornecedor:** destino **01 CD**, não se mexe. **Devolução Loja:** R1 + a loja que vai receber, e leva também a **folha de motivos**.",
      "Em todas: **visto do gerente**, **rótulo aqui**, **nota fiscal**, **volume** (ex.: 1/3) e **data** de saída. A área do CD fica em branco."
     ],
     "imgs": [
      {
       "arq": "07.jpg",
       "destaques": [],
       "retrato": true
      },
      {
       "arq": "08.jpg",
       "destaques": [],
       "retrato": true
      },
      {
       "arq": "09.jpg",
       "destaques": [],
       "retrato": true
      },
      {
       "arq": "10.jpg",
       "destaques": [],
       "retrato": true
      }
     ]
    },
    {
     "t": 390,
     "titulo": "Folha de motivos da devolução para loja",
     "texto": [
      "Na devolução para loja, a loja que recebe precisa saber **por que** o produto voltou. A folha tem os motivos: **defeito, produto sem condição de venda, pé queimado, pé único, saci, pés trocados, código errado e sem brinde**. A folha tem duas partes: recorte e use uma por caixa."
     ],
     "imgs": [
      {
       "arq": "11.jpg",
       "destaques": [],
       "retrato": true
      }
     ]
    },
    {
     "t": 436,
     "titulo": "Cole a placa na frente da caixa",
     "texto": [
      "A placa vai **na parte da frente**, bem visível e bem colada (fita em volta). Se a caixa for pequena demais, cole **em cima**."
     ],
     "imgs": [
      {
       "arq": "12.jpg",
       "destaques": [],
       "retrato": true
      },
      {
       "arq": "13.jpg",
       "destaques": [],
       "retrato": true
      }
     ]
    },
    {
     "t": 496,
     "titulo": "Cole rótulos em vários lados",
     "texto": [
      "Cole um rótulo **no espaço da placa** e os outros nas **laterais, na tampa e atrás**. Se a caixa ficar embaixo de outras, ainda dá para identificar.",
      "Por isso imprima **4 ou 5 rótulos** por volume."
     ],
     "imgs": [
      {
       "arq": "14.jpg",
       "destaques": [],
       "retrato": true
      },
      {
       "arq": "15.jpg",
       "destaques": [],
       "retrato": true
      }
     ]
    },
    {
     "t": 530,
     "titulo": "Tire ou cubra rótulos e placas antigas",
     "texto": [
      "Caixa reaproveitada chega com rótulo de outra loja ou placa do CD. **Retire**, **cole seu rótulo por cima** ou **rasure**, para a caixa não ser confundida com outro volume.",
      "O rótulo tem que sair **perfeito**. Se a impressora falhar ou rasurar, **reimprima**."
     ],
     "imgs": [
      {
       "arq": "16.jpg",
       "destaques": [],
       "retrato": true
      },
      {
       "arq": "17.jpg",
       "destaques": [],
       "retrato": true
      }
     ]
    },
    {
     "t": 624,
     "titulo": "Devolução para loja: placa em cima + motivo marcado",
     "texto": [
      "Na devolução para loja, cole a placa **em cima** e passe fita em volta para firmar. Recorte a **folha de motivos**, cole atrás da caixa e **marque com caneta** o motivo da devolução."
     ],
     "imgs": [
      {
       "arq": "18.jpg",
       "destaques": [],
       "retrato": true
      },
      {
       "arq": "19.jpg",
       "destaques": [],
       "retrato": true
      }
     ]
    }
   ]
  },
  {
   "id": "defeito",
   "ordem": 5,
   "nome": "Defeito",
   "duracao": "08:43",
   "accent": "#f87171",
   "objetivo": "Enviar ao **CD** os produtos com defeito da loja: marcar o produto como defeito no **SETA** (quando necessário), criar o volume na aba **Defeito** do BTA e gerar o **checkout da expedição**.",
   "quando": [
    "Cliente devolveu produto com defeito (processo feito pelo vendedor com o gerente) e o par chegou ao estoquista.",
    "Produto da loja com defeito de fábrica ou avariado, sem venda."
   ],
   "atencao": [
    "Defeito vai **sempre para 001 CD**: não altere o destino.",
    "Produto que dá **\"não consta no controle de defeitos\"** precisa ser marcado no SETA antes de bipar.",
    "Ao clicar no tamanho, o sistema **pula para o próximo**: confira o tamanho antes de marcar.",
    "Descreva o defeito e **qual pé** na observação.",
    "No checkout, bipe **todos os volumes**, não só um."
   ],
   "checklist": [
    "Par com defeito identificado e em mãos",
    "Se preciso: SETA → Estoque → Devolução ao Fornecedor → Marcar Defeito",
    "Tamanho certo, tipo de defeito e observação (qual pé)",
    "BTA → Defeito → Criar Volume (destino 001 CD) → Iniciar",
    "Defeitos bipados e Finalizar (rótulos impressos)",
    "Placa de DEFEITO preenchida e colada",
    "Checkout Expedição com todos os volumes bipados",
    "Papel da Expedição impresso → gerar nota fiscal"
   ],
   "passos": [
    {
     "t": 23,
     "titulo": "BTA: aba Defeito → Criar Volume",
     "texto": [
      "No **Controle Remanejo Loja**, clique na aba **Defeito**. Ela tem só dois botões: **Criar Volume** e **Checkout Expedição**. Clique em **Criar Volume**."
     ],
     "imgs": [
      {
       "arq": "01.jpg",
       "destaques": [
        {
         "x": 21.32,
         "y": 12.17,
         "w": 7.17,
         "h": 5.33,
         "rotulo": "1"
        },
        {
         "x": 4.72,
         "y": 20.67,
         "w": 88.68,
         "h": 6.67,
         "rotulo": "2 · Criar Volume"
        }
       ]
      }
     ]
    },
    {
     "t": 51,
     "titulo": "Confira origem e destino e clique em Iniciar",
     "texto": [
      "A **origem** é a sua loja e o **destino é 001 CD**. Defeito vai **direto para o CD**; não mude o destino.",
      "Separe uma caixa do tamanho certo para os defeitos, sem espaço sobrando. Clique em **Iniciar** e confirme com **Sim**."
     ],
     "imgs": [
      {
       "arq": "02.jpg",
       "destaques": [
        {
         "x": 22.97,
         "y": 11.63,
         "w": 22.86,
         "h": 5.81,
         "rotulo": "origem / 001 CD"
        },
        {
         "x": 0.99,
         "y": 9.53,
         "w": 12.31,
         "h": 4.42,
         "rotulo": "Iniciar"
        }
       ]
      }
     ]
    },
    {
     "t": 134,
     "titulo": "Bipe os defeitos",
     "texto": [
      "Bipe cada par com defeito. Eles aparecem na lista com a **quantidade total** embaixo.",
      "Se aparecer **\"Nenhum produto com status Na Loja foi encontrado no controle de defeitos\"**, o produto ainda está no estoque de venda (estoque 1). Faça antes o **tratamento no SETA** (passos 3 a 6) e depois bipe de novo."
     ],
     "imgs": [
      {
       "arq": "03.jpg",
       "destaques": [
        {
         "x": 34.07,
         "y": 42.79,
         "w": 31.1,
         "h": 23.72,
         "rotulo": "produto não consta como defeito"
        }
       ]
      }
     ]
    },
    {
     "t": 180,
     "titulo": "SETA: Estoque → Devolução ao Fornecedor",
     "texto": [
      "No SETA, entre em **Retaguarda** e abra o menu **Estoque → Devolução ao Fornecedor**. Na pergunta **\"Deseja usar a tela para bipar produtos com defeito?\"**, responda **Sim**."
     ],
     "imgs": [
      {
       "arq": "04.jpg",
       "destaques": [
        {
         "x": 10.11,
         "y": 3.21,
         "w": 4.02,
         "h": 2.9,
         "rotulo": "Estoque"
        },
        {
         "x": 10.11,
         "y": 35.23,
         "w": 17.39,
         "h": 3.11,
         "rotulo": "Devolução ao Fornecedor"
        }
       ]
      },
      {
       "arq": "05.jpg",
       "destaques": [
        {
         "x": 35.65,
         "y": 42.49,
         "w": 29.13,
         "h": 20.31,
         "rotulo": "Sim"
        }
       ]
      }
     ]
    },
    {
     "t": 226,
     "titulo": "Clique em Marcar Defeito",
     "texto": [
      "Na tela **Devolução ao fornecedor**, clique em **Marcar Defeito** para mandar o produto do estoque de venda para o estoque de defeito."
     ],
     "imgs": [
      {
       "arq": "06.jpg",
       "destaques": [
        {
         "x": 28.26,
         "y": 32.54,
         "w": 10.33,
         "h": 3.32,
         "rotulo": "Marcar Defeito"
        }
       ]
      }
     ]
    },
    {
     "t": 240,
     "titulo": "Informe o código e o tamanho",
     "texto": [
      "Digite o **código do produto** (sem o tamanho). Aparece a **grade** com o estoque de cada tamanho.",
      "Clique no **tamanho do par com defeito**. Atenção: no primeiro clique o sistema pula para o tamanho seguinte (clicou no 37, foi para o 38); **volte para o tamanho certo** e coloque **1** na coluna **Defeito**."
     ],
     "imgs": [
      {
       "arq": "07.jpg",
       "destaques": [
        {
         "x": 38.37,
         "y": 29.33,
         "w": 8.7,
         "h": 3.52,
         "rotulo": "código"
        },
        {
         "x": 61.74,
         "y": 49.84,
         "w": 16.09,
         "h": 3.32,
         "rotulo": "tamanho → Defeito = 1"
        }
       ]
      }
     ]
    },
    {
     "t": 318,
     "titulo": "Escolha o defeito, descreva e marque",
     "texto": [
      "No campo **Defeito**, pesquise e escolha o tipo (ex.: **descolamento**, descosturando). Em **Motivo/OBS** escreva qual pé e o problema (ex.: *\"pé direito descolando\"*) para o CD identificar melhor.",
      "Clique em **Marcar Defeito**, dê **OK** e feche. Volte ao BTA e bipe o par: agora ele entra na lista."
     ],
     "imgs": [
      {
       "arq": "08.jpg",
       "destaques": [
        {
         "x": 38.37,
         "y": 47.98,
         "w": 21.2,
         "h": 10.36,
         "rotulo": "Defeito + Motivo/OBS"
        },
        {
         "x": 20.0,
         "y": 27.77,
         "w": 8.48,
         "h": 3.32,
         "rotulo": "Marcar Defeito"
        }
       ]
      }
     ]
    },
    {
     "t": 386,
     "titulo": "Finalize o volume, imprima rótulos e prepare a placa",
     "texto": [
      "Com todos os defeitos bipados, clique em **Finalizar**. O sistema gera o **rótulo** (loja de origem → CD); imprima a quantidade para colar na caixa.",
      "Use a **placa de DEFEITO**: visto do gerente ou subgerente, origem (sua loja), destino **01 CD** já impresso, nota fiscal, volume e data de saída."
     ],
     "imgs": [
      {
       "arq": "09.jpg",
       "destaques": [
        {
         "x": 66.07,
         "y": 18.57,
         "w": 31.25,
         "h": 8.57,
         "rotulo": "visto do gerente"
        },
        {
         "x": 66.07,
         "y": 28.29,
         "w": 31.25,
         "h": 12.86,
         "rotulo": "rótulo"
        }
       ]
      }
     ]
    },
    {
     "t": 457,
     "titulo": "Checkout Expedição",
     "texto": [
      "Na aba Defeito, clique em **Checkout Expedição**. O destino já vem **001 CD** (não muda). Clique em **Iniciar** e confirme com **Sim**.",
      "Bipe **cada volume** (caixa) que você fez. Confira **Total Volumes** e **Qtde Itens** e clique em **Finalizar**."
     ],
     "imgs": [
      {
       "arq": "10.jpg",
       "destaques": [
        {
         "x": 39.13,
         "y": 14.52,
         "w": 15.76,
         "h": 3.81,
         "rotulo": "001 CD"
        },
        {
         "x": 58.7,
         "y": 14.52,
         "w": 13.26,
         "h": 3.81,
         "rotulo": "bipe o volume"
        },
        {
         "x": 76.09,
         "y": 10.71,
         "w": 19.78,
         "h": 8.1,
         "rotulo": "totais"
        },
        {
         "x": 1.52,
         "y": 11.9,
         "w": 11.96,
         "h": 4.52,
         "rotulo": "Iniciar"
        }
       ]
      }
     ]
    },
    {
     "t": 496,
     "titulo": "Imprima o papel da Expedição",
     "texto": [
      "Ao finalizar sai o **papel da Expedição** (loja → CD) com a quantidade de volumes e de itens. Imprima: ele é usado para gerar a **nota fiscal** (módulo Notas Fiscais)."
     ],
     "imgs": [
      {
       "arq": "11.jpg",
       "destaques": []
      }
     ]
    }
   ]
  },
  {
   "id": "remanejo",
   "ordem": 6,
   "nome": "Remanejo",
   "duracao": "09:11",
   "accent": "#4ade80",
   "objetivo": "Separar e enviar os produtos que outras lojas pediram à sua loja, via **R1 (CD Remanejo)**: consultar os pedidos, montar os volumes, imprimir rótulos e placa e gerar o **checkout da expedição**.",
   "quando": [
    "Quando aparecer no BTA pedido de transferência (TRF) em aberto para a sua loja enviar."
   ],
   "atencao": [
    "Destino do volume e do checkout é sempre **R1 (CD Remanejo)**, nunca \"CD\" direto.",
    "Confira cada par (sujo, trocado, defeito) **antes** de criar o volume.",
    "Rótulo só pode ser reimpresso **antes do checkout**.",
    "No checkout, bipe **todos os volumes** e confira totais de volumes e itens.",
    "Placa de remanejo com **visto do gerente** e loja de destino (R1/loja)."
   ],
   "checklist": [
    "Pedido de TRF em Aberto consultado e impresso por loja",
    "Pares conferidos (sem sujeira, troca ou defeito)",
    "Criar Volume: destino R1 + destino final da loja",
    "Pares bipados, Itens/Qtde conferidos e Finalizar",
    "Rótulos impressos e placa de REMANEJO preenchida",
    "Checkout Expedição com destino R1 e todos os volumes",
    "Papel da Expedição impresso → nota fiscal emitida"
   ],
   "passos": [
    {
     "t": 13,
     "titulo": "BTA: aba Remanejo → Pedido de TRF em Aberto",
     "texto": [
      "Antes de montar o remanejo, veja **o que cada loja está pedindo**. Na aba **Remanejo**, clique em **Pedido de TRF em Aberto**."
     ],
     "imgs": [
      {
       "arq": "01.jpg",
       "destaques": [
        {
         "x": 4.53,
         "y": 12.17,
         "w": 7.17,
         "h": 5.33,
         "rotulo": "1"
        },
        {
         "x": 4.72,
         "y": 20.67,
         "w": 88.68,
         "h": 6.67,
         "rotulo": "2 · Pedido de TRF em Aberto"
        }
       ]
      }
     ]
    },
    {
     "t": 30,
     "titulo": "Veja os pedidos e imprima a lista",
     "texto": [
      "Em **Saldo Pedidos de Transferência** aparecem todos os produtos pedidos: código, descrição, cor, **destino** (loja que pediu) e **saldo** (quantidade pedida).",
      "Clique em **Imprimir** para tirar o papel com todas as lojas."
     ],
     "imgs": [
      {
       "arq": "02.jpg",
       "destaques": [
        {
         "x": 3.41,
         "y": 20.47,
         "w": 12.42,
         "h": 4.88,
         "rotulo": "Imprimir"
        },
        {
         "x": 59.34,
         "y": 26.16,
         "w": 14.29,
         "h": 65.12,
         "rotulo": "destino"
        },
        {
         "x": 73.08,
         "y": 26.16,
         "w": 6.04,
         "h": 65.12,
         "rotulo": "saldo"
        }
       ]
      }
     ]
    },
    {
     "t": 82,
     "titulo": "Filtre uma loja por vez",
     "texto": [
      "Em **Destino**, escolha a loja (ex.: 048) e clique em **Filtrar**. Aparece só o que vai para ela; imprima a folha dessa loja e separe os produtos."
     ],
     "imgs": [
      {
       "arq": "03.jpg",
       "destaques": [
        {
         "x": 31.76,
         "y": 18.6,
         "w": 15.38,
         "h": 3.72,
         "rotulo": "Destino"
        },
        {
         "x": 3.19,
         "y": 15.35,
         "w": 12.53,
         "h": 4.42,
         "rotulo": "Filtrar"
        }
       ]
      }
     ]
    },
    {
     "t": 146,
     "titulo": "Confira os pares e monte a caixa",
     "texto": [
      "Antes de criar o volume, confira cada par: **não está sujo, trocado nem com defeito**, tem condição de venda.",
      "Coloque na caixa só a quantidade que ela suporta. Se a loja pediu muitos produtos, faça **mais de um volume**."
     ],
     "dica": "Não envie tudo de uma vez só porque a loja pediu: primeiro a caixa, depois a criação do volume."
    },
    {
     "t": 184,
     "titulo": "Criar Volume: destino R1 e destino final",
     "texto": [
      "Clique em **Criar Volume**. A origem é a sua loja e o destino é sempre **R1 - CD Remanejo**: o volume passa pelo CD e depois segue para a loja.",
      "Na **lupa do Destino Final**, pesquise a loja (ex.: 048), selecione e clique em **Exportar**."
     ],
     "imgs": [
      {
       "arq": "04.jpg",
       "destaques": [
        {
         "x": 27.47,
         "y": 17.79,
         "w": 28.57,
         "h": 66.28,
         "rotulo": "escolha a loja"
        },
        {
         "x": 13.74,
         "y": 19.77,
         "w": 12.31,
         "h": 4.88,
         "rotulo": "Exportar"
        }
       ]
      },
      {
       "arq": "05.jpg",
       "destaques": [
        {
         "x": 22.86,
         "y": 14.77,
         "w": 22.53,
         "h": 3.49,
         "rotulo": "R1 - CD Remanejo"
        },
        {
         "x": 22.86,
         "y": 18.02,
         "w": 22.53,
         "h": 3.49,
         "rotulo": "destino final"
        },
        {
         "x": 0.99,
         "y": 9.53,
         "w": 12.31,
         "h": 4.42,
         "rotulo": "Iniciar"
        }
       ]
      }
     ]
    },
    {
     "t": 223,
     "titulo": "Iniciar e bipar os produtos",
     "texto": [
      "Clique em **Iniciar** e confirme a loja com **Sim**. Bipe todos os pares da caixa. Confira no alto: **Itens** (produtos diferentes) e **Qtde** (total de pares). Se a caixa cabe 12, a quantidade tem que dar 12.",
      "Clique em **Finalizar**."
     ],
     "imgs": [
      {
       "arq": "06.jpg",
       "destaques": [
        {
         "x": 14.29,
         "y": 28.26,
         "w": 31.32,
         "h": 4.42,
         "rotulo": "bipe os pares"
        },
        {
         "x": 49.45,
         "y": 11.4,
         "w": 14.84,
         "h": 6.4,
         "rotulo": "Itens / Qtde"
        },
        {
         "x": 0.99,
         "y": 14.88,
         "w": 12.31,
         "h": 4.42,
         "rotulo": "Finalizar"
        }
       ]
      }
     ]
    },
    {
     "t": 270,
     "titulo": "Imprima os rótulos e preencha a placa de REMANEJO",
     "texto": [
      "Ao finalizar sai o **rótulo** na impressora (Argox/Datamax). Tire a quantidade para colar na caixa.",
      "Na **placa de REMANEJO**: visto do gerente, **origem** (sua loja), **destino R1/** + a loja (ex.: R1/48), **nota fiscal** (depois de emitida), **volume** e **data** em que o caminhão leva. A parte do CD fica em branco."
     ],
     "imgs": [
      {
       "arq": "07.jpg",
       "destaques": []
      }
     ]
    },
    {
     "t": 406,
     "titulo": "Perdeu o rótulo? Volumes em Aberto → Etiquetas",
     "texto": [
      "Para reimprimir um rótulo: **Volumes em Aberto**, escolha o **Destino** (a loja), **Filtrar**, selecione o volume e clique em **Etiquetas**.",
      "**Só dá para reimprimir antes de fazer o checkout**. Depois da expedição gerada, não dá mais."
     ],
     "imgs": [
      {
       "arq": "08.jpg",
       "destaques": [
        {
         "x": 32.86,
         "y": 16.74,
         "w": 15.71,
         "h": 3.72,
         "rotulo": "Destino"
        },
        {
         "x": 4.29,
         "y": 13.95,
         "w": 11.87,
         "h": 4.65,
         "rotulo": "Filtrar"
        },
        {
         "x": 4.29,
         "y": 23.95,
         "w": 11.87,
         "h": 4.65,
         "rotulo": "Etiquetas"
        }
       ]
      }
     ]
    },
    {
     "t": 434,
     "titulo": "Checkout Expedição com destino R1",
     "texto": [
      "Clique em **Checkout Expedição**. O destino vem **CD**: **troque para R1 - CD Remanejo**. Clique em **Iniciar** e confirme com **Sim**.",
      "Bipe **todos os volumes** que fez (não só um). Confira **Total Volumes** e **Qtde Itens** (ex.: 5 volumes, 30 itens) e clique em **Finalizar**."
     ],
     "imgs": [
      {
       "arq": "09.jpg",
       "destaques": [
        {
         "x": 39.13,
         "y": 17.57,
         "w": 15.76,
         "h": 4.29,
         "rotulo": "R1"
        },
        {
         "x": 58.7,
         "y": 17.57,
         "w": 13.26,
         "h": 4.29,
         "rotulo": "bipe cada volume"
        },
        {
         "x": 76.09,
         "y": 13.14,
         "w": 23.91,
         "h": 9.29,
         "rotulo": "totais"
        }
       ]
      }
     ]
    },
    {
     "t": 529,
     "titulo": "Imprima a Expedição e gere a nota",
     "texto": [
      "Ao finalizar abre o papel da **Expedição** para imprimir na impressora da loja. Com ele você gera a **nota fiscal** (módulo Notas Fiscais) e completa a placa."
     ],
     "imgs": [
      {
       "arq": "10.jpg",
       "destaques": []
      }
     ]
    }
   ]
  }
 ]
};
