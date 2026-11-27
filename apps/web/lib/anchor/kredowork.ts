/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/kredowork.json`.
 */
export type Kredowork = {
  "address": "2xudVYfkKXUSF5vdbhgXpV3bG8m479iE2xG2EyLi8o3j",
  "metadata": {
    "name": "kredowork",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "approveWork",
      "discriminator": [
        181,
        118,
        45,
        143,
        204,
        88,
        237,
        109
      ],
      "accounts": [
        {
          "name": "workspace",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  119,
                  111,
                  114,
                  107,
                  115,
                  112,
                  97,
                  99,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "workspace.authority",
                "account": "workspaceConfig"
              },
              {
                "kind": "account",
                "path": "workspace.workspaceId",
                "account": "workspaceConfig"
              }
            ]
          },
          "relations": [
            "bounty"
          ]
        },
        {
          "name": "bounty",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  117,
                  110,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "workspace"
              },
              {
                "kind": "arg",
                "path": "bountyId"
              }
            ]
          }
        },
        {
          "name": "reviewer",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "bountyId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "cancelBounty",
      "discriminator": [
        79,
        65,
        107,
        143,
        128,
        165,
        135,
        46
      ],
      "accounts": [
        {
          "name": "workspace",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  119,
                  111,
                  114,
                  107,
                  115,
                  112,
                  97,
                  99,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "workspace.authority",
                "account": "workspaceConfig"
              },
              {
                "kind": "account",
                "path": "workspace.workspaceId",
                "account": "workspaceConfig"
              }
            ]
          },
          "relations": [
            "bounty"
          ]
        },
        {
          "name": "bounty",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  117,
                  110,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "workspace"
              },
              {
                "kind": "arg",
                "path": "bountyId"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "bounty"
              }
            ]
          }
        },
        {
          "name": "sponsor",
          "writable": true,
          "signer": true,
          "relations": [
            "bounty"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "bountyId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "challengeBounty",
      "discriminator": [
        91,
        37,
        85,
        217,
        178,
        9,
        202,
        38
      ],
      "accounts": [
        {
          "name": "workspace",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  119,
                  111,
                  114,
                  107,
                  115,
                  112,
                  97,
                  99,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "workspace.authority",
                "account": "workspaceConfig"
              },
              {
                "kind": "account",
                "path": "workspace.workspaceId",
                "account": "workspaceConfig"
              }
            ]
          },
          "relations": [
            "bounty"
          ]
        },
        {
          "name": "bounty",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  117,
                  110,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "workspace"
              },
              {
                "kind": "arg",
                "path": "bountyId"
              }
            ]
          }
        },
        {
          "name": "dispute",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  105,
                  115,
                  112,
                  117,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "bounty"
              }
            ]
          }
        },
        {
          "name": "disputeVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  105,
                  115,
                  112,
                  117,
                  116,
                  101,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "dispute"
              }
            ]
          }
        },
        {
          "name": "challenger",
          "writable": true,
          "signer": true
        },
        {
          "name": "respondent"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "bountyId",
          "type": "u64"
        },
        {
          "name": "challengeEvidenceHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "createBounty",
      "discriminator": [
        122,
        90,
        14,
        143,
        8,
        125,
        200,
        2
      ],
      "accounts": [
        {
          "name": "workspace",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  119,
                  111,
                  114,
                  107,
                  115,
                  112,
                  97,
                  99,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "workspace.authority",
                "account": "workspaceConfig"
              },
              {
                "kind": "account",
                "path": "workspace.workspaceId",
                "account": "workspaceConfig"
              }
            ]
          }
        },
        {
          "name": "bounty",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  117,
                  110,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "workspace"
              },
              {
                "kind": "account",
                "path": "workspace.bountyCount",
                "account": "workspaceConfig"
              }
            ]
          }
        },
        {
          "name": "vault",
          "docs": [
            "transfer."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "bounty"
              }
            ]
          }
        },
        {
          "name": "sponsor",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "rewardAmount",
          "type": "u64"
        },
        {
          "name": "specHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "deadlineTs",
          "type": "i64"
        }
      ]
    },
    {
      "name": "finalizePayout",
      "discriminator": [
        80,
        105,
        227,
        22,
        73,
        169,
        249,
        67
      ],
      "accounts": [
        {
          "name": "workspace",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  119,
                  111,
                  114,
                  107,
                  115,
                  112,
                  97,
                  99,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "workspace.authority",
                "account": "workspaceConfig"
              },
              {
                "kind": "account",
                "path": "workspace.workspaceId",
                "account": "workspaceConfig"
              }
            ]
          },
          "relations": [
            "bounty"
          ]
        },
        {
          "name": "bounty",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  117,
                  110,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "workspace"
              },
              {
                "kind": "arg",
                "path": "bountyId"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "bounty"
              }
            ]
          }
        },
        {
          "name": "contributor",
          "writable": true
        },
        {
          "name": "contributorReputation",
          "docs": [
            "Contributor reputation profile (optional): validated against",
            "`[REPUTATION_SEED, contributor.key()]` only if `Some` is provided."
          ],
          "writable": true,
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  112,
                  117,
                  116,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "contributor"
              }
            ]
          }
        },
        {
          "name": "feeRecipient",
          "writable": true
        },
        {
          "name": "caller",
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "bountyId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initializeReputation",
      "discriminator": [
        150,
        240,
        109,
        53,
        147,
        42,
        152,
        162
      ],
      "accounts": [
        {
          "name": "profile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  112,
                  117,
                  116,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initializeWorkspace",
      "discriminator": [
        254,
        175,
        175,
        109,
        133,
        88,
        204,
        239
      ],
      "accounts": [
        {
          "name": "workspace",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  119,
                  111,
                  114,
                  107,
                  115,
                  112,
                  97,
                  99,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "arg",
                "path": "params.workspaceId"
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "workspaceParams"
            }
          }
        }
      ]
    },
    {
      "name": "reclaimExpired",
      "discriminator": [
        125,
        185,
        48,
        75,
        0,
        71,
        93,
        98
      ],
      "accounts": [
        {
          "name": "workspace",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  119,
                  111,
                  114,
                  107,
                  115,
                  112,
                  97,
                  99,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "workspace.authority",
                "account": "workspaceConfig"
              },
              {
                "kind": "account",
                "path": "workspace.workspaceId",
                "account": "workspaceConfig"
              }
            ]
          },
          "relations": [
            "bounty"
          ]
        },
        {
          "name": "bounty",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  117,
                  110,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "workspace"
              },
              {
                "kind": "arg",
                "path": "bountyId"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "bounty"
              }
            ]
          }
        },
        {
          "name": "sponsor",
          "writable": true,
          "relations": [
            "bounty"
          ]
        },
        {
          "name": "caller",
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "bountyId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "rejectWork",
      "discriminator": [
        129,
        238,
        59,
        133,
        63,
        148,
        130,
        54
      ],
      "accounts": [
        {
          "name": "workspace",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  119,
                  111,
                  114,
                  107,
                  115,
                  112,
                  97,
                  99,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "workspace.authority",
                "account": "workspaceConfig"
              },
              {
                "kind": "account",
                "path": "workspace.workspaceId",
                "account": "workspaceConfig"
              }
            ]
          },
          "relations": [
            "bounty"
          ]
        },
        {
          "name": "bounty",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  117,
                  110,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "workspace"
              },
              {
                "kind": "arg",
                "path": "bountyId"
              }
            ]
          }
        },
        {
          "name": "reviewer",
          "signer": true
        },
        {
          "name": "contributorReputation",
          "docs": [
            "Rejected claimant reputation profile (optional): if `Some` is provided,",
            "validates that its address matches the PDA `[REPUTATION_SEED, claimant]`."
          ],
          "optional": true
        }
      ],
      "args": [
        {
          "name": "bountyId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "resolveDispute",
      "discriminator": [
        231,
        6,
        202,
        6,
        96,
        103,
        12,
        230
      ],
      "accounts": [
        {
          "name": "workspace",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  119,
                  111,
                  114,
                  107,
                  115,
                  112,
                  97,
                  99,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "workspace.authority",
                "account": "workspaceConfig"
              },
              {
                "kind": "account",
                "path": "workspace.workspaceId",
                "account": "workspaceConfig"
              }
            ]
          },
          "relations": [
            "bounty"
          ]
        },
        {
          "name": "bounty",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  117,
                  110,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "workspace"
              },
              {
                "kind": "arg",
                "path": "bountyId"
              }
            ]
          },
          "relations": [
            "dispute"
          ]
        },
        {
          "name": "dispute",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  105,
                  115,
                  112,
                  117,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "bounty"
              }
            ]
          }
        },
        {
          "name": "bountyVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "bounty"
              }
            ]
          }
        },
        {
          "name": "disputeVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  105,
                  115,
                  112,
                  117,
                  116,
                  101,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "dispute"
              }
            ]
          }
        },
        {
          "name": "sponsor",
          "writable": true,
          "relations": [
            "bounty"
          ]
        },
        {
          "name": "winner",
          "writable": true
        },
        {
          "name": "loser"
        },
        {
          "name": "feeRecipient",
          "writable": true
        },
        {
          "name": "caller",
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "winnerReputation",
          "docs": [
            "Winner reputation profile (optional): validated against `[REPUTATION_SEED, winner.key()]` in the handler."
          ],
          "writable": true,
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  112,
                  117,
                  116,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "winner"
              }
            ]
          }
        },
        {
          "name": "loserReputation",
          "docs": [
            "Loser reputation profile (optional): validated against `[REPUTATION_SEED, loser.key()]` in the handler."
          ],
          "writable": true,
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  112,
                  117,
                  116,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "loser"
              }
            ]
          }
        },
        {
          "name": "reviewerReputation",
          "docs": [
            "Reviewer reputation profile who rejected the work (optional): validated against",
            "`[REPUTATION_SEED, bounty.rejected_by()]` in the handler."
          ],
          "optional": true
        }
      ],
      "args": [
        {
          "name": "bountyId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "setPaused",
      "discriminator": [
        91,
        60,
        125,
        192,
        176,
        225,
        166,
        218
      ],
      "accounts": [
        {
          "name": "workspace",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  119,
                  111,
                  114,
                  107,
                  115,
                  112,
                  97,
                  99,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "workspace.authority",
                "account": "workspaceConfig"
              },
              {
                "kind": "account",
                "path": "workspace.workspaceId",
                "account": "workspaceConfig"
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "workspace"
          ]
        }
      ],
      "args": [
        {
          "name": "isPaused",
          "type": "bool"
        }
      ]
    },
    {
      "name": "submitDefense",
      "discriminator": [
        17,
        157,
        193,
        70,
        166,
        240,
        78,
        78
      ],
      "accounts": [
        {
          "name": "workspace",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  119,
                  111,
                  114,
                  107,
                  115,
                  112,
                  97,
                  99,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "workspace.authority",
                "account": "workspaceConfig"
              },
              {
                "kind": "account",
                "path": "workspace.workspaceId",
                "account": "workspaceConfig"
              }
            ]
          },
          "relations": [
            "bounty"
          ]
        },
        {
          "name": "bounty",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  117,
                  110,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "workspace"
              },
              {
                "kind": "arg",
                "path": "bountyId"
              }
            ]
          },
          "relations": [
            "dispute"
          ]
        },
        {
          "name": "dispute",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  105,
                  115,
                  112,
                  117,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "bounty"
              }
            ]
          }
        },
        {
          "name": "disputeVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  105,
                  115,
                  112,
                  117,
                  116,
                  101,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "dispute"
              }
            ]
          }
        },
        {
          "name": "respondent",
          "writable": true,
          "signer": true,
          "relations": [
            "dispute"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "bountyId",
          "type": "u64"
        },
        {
          "name": "defenseEvidenceHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "submitWork",
      "discriminator": [
        158,
        80,
        101,
        51,
        114,
        130,
        101,
        253
      ],
      "accounts": [
        {
          "name": "workspace",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  119,
                  111,
                  114,
                  107,
                  115,
                  112,
                  97,
                  99,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "workspace.authority",
                "account": "workspaceConfig"
              },
              {
                "kind": "account",
                "path": "workspace.workspaceId",
                "account": "workspaceConfig"
              }
            ]
          },
          "relations": [
            "bounty"
          ]
        },
        {
          "name": "bounty",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  117,
                  110,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "workspace"
              },
              {
                "kind": "arg",
                "path": "bountyId"
              }
            ]
          }
        },
        {
          "name": "contributor",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "bountyId",
          "type": "u64"
        },
        {
          "name": "deliveryHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "updateWorkspace",
      "discriminator": [
        2,
        92,
        107,
        205,
        246,
        15,
        162,
        221
      ],
      "accounts": [
        {
          "name": "workspace",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  119,
                  111,
                  114,
                  107,
                  115,
                  112,
                  97,
                  99,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "workspace.authority",
                "account": "workspaceConfig"
              },
              {
                "kind": "account",
                "path": "workspace.workspaceId",
                "account": "workspaceConfig"
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "workspace"
          ]
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "updateWorkspaceParams"
            }
          }
        }
      ]
    },
    {
      "name": "voteDispute",
      "discriminator": [
        23,
        190,
        211,
        170,
        65,
        223,
        4,
        243
      ],
      "accounts": [
        {
          "name": "workspace",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  119,
                  111,
                  114,
                  107,
                  115,
                  112,
                  97,
                  99,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "workspace.authority",
                "account": "workspaceConfig"
              },
              {
                "kind": "account",
                "path": "workspace.workspaceId",
                "account": "workspaceConfig"
              }
            ]
          },
          "relations": [
            "bounty"
          ]
        },
        {
          "name": "bounty",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  117,
                  110,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "workspace"
              },
              {
                "kind": "arg",
                "path": "bountyId"
              }
            ]
          },
          "relations": [
            "dispute"
          ]
        },
        {
          "name": "dispute",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  105,
                  115,
                  112,
                  117,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "bounty"
              }
            ]
          }
        },
        {
          "name": "arbiter",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "bountyId",
          "type": "u64"
        },
        {
          "name": "side",
          "type": {
            "defined": {
              "name": "disputeVoteSide"
            }
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "bountyAccount",
      "discriminator": [
        79,
        173,
        237,
        26,
        118,
        105,
        127,
        194
      ]
    },
    {
      "name": "disputeAccount",
      "discriminator": [
        237,
        70,
        91,
        63,
        81,
        74,
        45,
        43
      ]
    },
    {
      "name": "reputationProfile",
      "discriminator": [
        73,
        32,
        193,
        201,
        177,
        91,
        104,
        136
      ]
    },
    {
      "name": "workspaceConfig",
      "discriminator": [
        183,
        103,
        70,
        12,
        5,
        151,
        35,
        167
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "workspacePaused",
      "msg": "The workspace is currently paused."
    },
    {
      "code": 6001,
      "name": "invalidRewardAmount",
      "msg": "The reward amount must be greater than zero."
    },
    {
      "code": 6002,
      "name": "invalidDeadline",
      "msg": "The deadline must be in the future."
    },
    {
      "code": 6003,
      "name": "invalidStateTransition",
      "msg": "State transition not permitted for the current state."
    },
    {
      "code": 6004,
      "name": "unauthorizedReviewer",
      "msg": "The signature does not belong to an authorized reviewer for the space."
    },
    {
      "code": 6005,
      "name": "unauthorizedArbiter",
      "msg": "The signature does not belong to an arbitrator assigned to the dispute."
    },
    {
      "code": 6006,
      "name": "tooManyReviewers",
      "msg": "There are too many reviewers; only 8 are permitted."
    },
    {
      "code": 6007,
      "name": "selfApprovalNotAllowed",
      "msg": "It is not permitted to approve or charge for one's own task, or one that has been self-approved."
    },
    {
      "code": 6008,
      "name": "quorumNotReached",
      "msg": "The minimum required quorum has not been reached."
    },
    {
      "code": 6009,
      "name": "windowNotExpired",
      "msg": "The time window has not yet expired."
    },
    {
      "code": 6010,
      "name": "windowExpired",
      "msg": "The time window has expired."
    },
    {
      "code": 6011,
      "name": "insufficientBond",
      "msg": "The bond amount is insufficient."
    },
    {
      "code": 6012,
      "name": "duplicateAction",
      "msg": "A duplicate vote or action has already been recorded."
    },
    {
      "code": 6013,
      "name": "mathOverflow",
      "msg": "Arithmetic overflow in the calculation of funds or score"
    },
    {
      "code": 6014,
      "name": "duplicateReviewer",
      "msg": "Duplicate reviewer detected in the reviewer list."
    },
    {
      "code": 6015,
      "name": "invalidQuorumThreshold",
      "msg": "The quorum threshold must be greater than zero."
    },
    {
      "code": 6016,
      "name": "quorumExceedsReviewers",
      "msg": "The quorum threshold cannot exceed the number of reviewers."
    },
    {
      "code": 6017,
      "name": "invalidMaxSubmissionAttempts",
      "msg": "The maximum submission attempts must be greater than zero."
    },
    {
      "code": 6018,
      "name": "invalidWindowDuration",
      "msg": "The window duration must be greater than zero."
    },
    {
      "code": 6019,
      "name": "invalidClaimant",
      "msg": "The provided contributor does not match the bounty claimant."
    },
    {
      "code": 6020,
      "name": "bountyIdMismatch",
      "msg": "The provided bounty ID does not match the account bounty ID."
    },
    {
      "code": 6021,
      "name": "invalidBps",
      "msg": "The fee or bond basis points cannot exceed the maximum of 10,000."
    },
    {
      "code": 6022,
      "name": "maxAttemptsReached",
      "msg": "The maximum submission attempts has been reached."
    },
    {
      "code": 6023,
      "name": "invalidChallenger",
      "msg": "The challenger and respondent do not form a valid dispute pair."
    }
  ],
  "types": [
    {
      "name": "bountyAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "workspace",
            "type": "pubkey"
          },
          {
            "name": "sponsor",
            "type": "pubkey"
          },
          {
            "name": "claimant",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "rejectedClaimant",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "rejectedBy",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "bountyId",
            "type": "u64"
          },
          {
            "name": "rewardAmount",
            "type": "u64"
          },
          {
            "name": "lockedBond",
            "type": "u64"
          },
          {
            "name": "specHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "deliveryHash",
            "type": {
              "option": {
                "array": [
                  "u8",
                  32
                ]
              }
            }
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "bountyStatus"
              }
            }
          },
          {
            "name": "deadlineTs",
            "type": "i64"
          },
          {
            "name": "submittedAtTs",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "windowEndsAtTs",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "approvalsCount",
            "type": "u8"
          },
          {
            "name": "approvalsMask",
            "type": "u8"
          },
          {
            "name": "approvalsEpoch",
            "type": "u16"
          },
          {
            "name": "submissionAttempts",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "vaultBump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "bountyStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "open"
          },
          {
            "name": "claimed"
          },
          {
            "name": "submitted"
          },
          {
            "name": "preApproved"
          },
          {
            "name": "rejected"
          },
          {
            "name": "disputed"
          },
          {
            "name": "completed"
          },
          {
            "name": "cancelled"
          },
          {
            "name": "expired"
          }
        ]
      }
    },
    {
      "name": "disputeAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bounty",
            "type": "pubkey"
          },
          {
            "name": "challenger",
            "type": "pubkey"
          },
          {
            "name": "respondent",
            "type": "pubkey"
          },
          {
            "name": "challengeBond",
            "type": "u64"
          },
          {
            "name": "defenseBond",
            "type": "u64"
          },
          {
            "name": "challengeEvidenceHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "defenseEvidenceHash",
            "type": {
              "option": {
                "array": [
                  "u8",
                  32
                ]
              }
            }
          },
          {
            "name": "arbiters",
            "type": {
              "array": [
                "pubkey",
                3
              ]
            }
          },
          {
            "name": "votesForChallenger",
            "type": "u8"
          },
          {
            "name": "votesForRespondent",
            "type": "u8"
          },
          {
            "name": "votesMask",
            "type": "u8"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "disputeStatus"
              }
            }
          },
          {
            "name": "deadlineTs",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "disputeStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "open"
          },
          {
            "name": "resolvedForChallenger"
          },
          {
            "name": "resolvedForRespondent"
          }
        ]
      }
    },
    {
      "name": "disputeVoteSide",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "challenger"
          },
          {
            "name": "respondent"
          }
        ]
      }
    },
    {
      "name": "reputationProfile",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "bountiesCompleted",
            "type": "u64"
          },
          {
            "name": "bountiesRejected",
            "type": "u64"
          },
          {
            "name": "totalEarned",
            "type": "u64"
          },
          {
            "name": "disputesWon",
            "type": "u64"
          },
          {
            "name": "disputesLost",
            "type": "u64"
          },
          {
            "name": "overturnedReviews",
            "type": "u64"
          },
          {
            "name": "reputationScore",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "updateWorkspaceParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "challengeWindowSecs",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "reviewTimeoutSecs",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "reviewers",
            "type": {
              "option": {
                "vec": "pubkey"
              }
            }
          }
        ]
      }
    },
    {
      "name": "workspaceConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "workspaceId",
            "type": "u64"
          },
          {
            "name": "bountyCount",
            "type": "u64"
          },
          {
            "name": "quorumThreshold",
            "type": "u8"
          },
          {
            "name": "maxSubmissionAttempts",
            "type": "u8"
          },
          {
            "name": "challengeWindowSecs",
            "type": "i64"
          },
          {
            "name": "reviewTimeoutSecs",
            "type": "i64"
          },
          {
            "name": "feeBps",
            "type": "u16"
          },
          {
            "name": "bondBps",
            "type": "u16"
          },
          {
            "name": "reviewersEpoch",
            "type": "u16"
          },
          {
            "name": "reviewers",
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "isPaused",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "workspaceParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "workspaceId",
            "type": "u64"
          },
          {
            "name": "quorumThreshold",
            "type": "u8"
          },
          {
            "name": "maxSubmissionAttempts",
            "type": "u8"
          },
          {
            "name": "challengeWindowSecs",
            "type": "i64"
          },
          {
            "name": "reviewTimeoutSecs",
            "type": "i64"
          },
          {
            "name": "feeBps",
            "type": "u16"
          },
          {
            "name": "bondBps",
            "type": "u16"
          },
          {
            "name": "reviewers",
            "type": {
              "vec": "pubkey"
            }
          }
        ]
      }
    }
  ],
  "constants": [
    {
      "name": "bountySeed",
      "type": "bytes",
      "value": "[98, 111, 117, 110, 116, 121]"
    },
    {
      "name": "disputeSeed",
      "type": "bytes",
      "value": "[100, 105, 115, 112, 117, 116, 101]"
    },
    {
      "name": "disputeVaultSeed",
      "type": "bytes",
      "value": "[100, 105, 115, 112, 117, 116, 101, 95, 118, 97, 117, 108, 116]"
    },
    {
      "name": "reputationSeed",
      "type": "bytes",
      "value": "[114, 101, 112, 117, 116, 97, 116, 105, 111, 110]"
    },
    {
      "name": "vaultSeed",
      "type": "bytes",
      "value": "[118, 97, 117, 108, 116]"
    },
    {
      "name": "workspaceSeed",
      "type": "bytes",
      "value": "[119, 111, 114, 107, 115, 112, 97, 99, 101]"
    }
  ]
};
