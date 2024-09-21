import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient, useSuiClientQuery } from "@mysten/dapp-kit";
import { SuiObjectData } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { Button, Flex, Heading, Text } from "@radix-ui/themes";
import { useState } from "react";
import { useNetworkVariable } from "./networkConfig";

export function Counter({ id }: { id: string }) {
  const currentAccount = useCurrentAccount();
  const counterPackageId = useNetworkVariable("counterPackageId");
  const suiClient = useSuiClient();
  const [newValue, setNewValue] = useState(0); 

  const {mutate: signAndExecute} = useSignAndExecuteTransaction({
    execute: async ({bytes, signature}) => await suiClient.executeTransactionBlock({
      transactionBlock: bytes,
      signature,
      options: {
        showRawEffects: true,
        showEffects: true,
      }
    })
  })
  const { data, isPending, error, refetch } = useSuiClientQuery("getObject", {
    id,
    options: {
      showContent: true,
      showOwner: true,
    },
  });

  const executeMoveCall = (
    method: "increment" | "decrement" | "set_value"
  ) => {
    const tx = new Transaction();
    if(method === "set_value"){
    tx.moveCall({
      arguments: [tx.object(id), tx.pure.u64(newValue)],
      target: `${counterPackageId}::counter::${method}`
    });
  } else {
    tx.moveCall({
      arguments: [tx.object(id)],
      target: `${counterPackageId}::counter::${method}`
    });
  } 
  tx.setGasBudget(10000000000);
  signAndExecute(
    {
      transaction: tx,
    },
    {
      onSuccess: async() => {
        await refetch();
      },
    }
  );
    
  };

  function getCounterFields(data: SuiObjectData) {
    if (data.content?.dataType !== "moveObject") {
      return null;
    }
    return data.content.fields as { value: number; owner: string };
  }

  if (isPending) return <Text>Loading...</Text>;

  if (error) return <Text>Error: {error.message}</Text>;

  if (!data.data) return <Text>Not found</Text>;

  const ownedByCurrentAccount =
    getCounterFields(data.data)?.owner === currentAccount?.address;

  return (
    <>
      <Heading size="3">Counter {id}</Heading>
      <Flex direction="column" gap="2">
        <Text>Count: {getCounterFields(data.data)?.value}</Text>
        <Flex direction="row" gap="2">
          <Button onClick={() => executeMoveCall("increment")}>
            Increment
          </Button>
          <Button onClick={() => executeMoveCall("decrement")}>
            Decrement
          </Button>
          {ownedByCurrentAccount ? (
            <>
              <input
                type="number"
                value={newValue}
                onChange={(e) => setNewValue(Number(e.target.value))}
                placeholder="Set new value"
              />
              <Button onClick={() => executeMoveCall("set_value")}>
                Set Value
              </Button>
            </>
          ) : null}
        </Flex>
      </Flex>
    </>
  );
}
