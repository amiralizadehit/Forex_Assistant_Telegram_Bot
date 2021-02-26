enum ExceptionName {
  GenericException,
  InvalidOperationFormat,
  InvalidSignalFormat,
  InvalidPriceFormat,
  InvalidTPOrSLFormat,
  InvalidSLFormat,
  ExchangerNetworkException,
}

enum ClientMessage {
  GenericException = "Oh! Something went wrong. Try to contact @amiralizadehit.",
  InvalidSignal = "Sorry, the signal is not in the correct format.",
  InvalidOperation = "Sorry, the operation is not in the correct format. It should be either buy or sell.",
  InvalidPrice = "Sorry, the entry price is not in the correct format. It should be a positive number.",
  InvalidTPOrSL = "Sorry, either take profit or stop loss is not in the correct format. They should be positive numbers.",
  EXCHANGER_NETWORK = "Sorry, we couldn't retrieve the exchange ratio for your base currency.",
}

class BotException extends Error {
  public type: ExceptionName;
  private clientMessage: string;
  private errorCode: string;
  constructor(
    errorCode: string,
    type: ExceptionName | undefined,
    message?: string
  ) {
    super();
    if (!type) {
      type = ExceptionName.GenericException;
    }
    this.errorCode = errorCode;
    this.type = type;
    if (message) {
      this.clientMessage = message;
    } else {
      switch (type) {
        case ExceptionName.GenericException:
          this.clientMessage = ClientMessage.GenericException;
          break;
        case ExceptionName.InvalidSignalFormat:
          this.clientMessage = ClientMessage.InvalidSignal;
          break;
        case ExceptionName.InvalidOperationFormat:
          this.clientMessage = ClientMessage.InvalidOperation;
          break;
        case ExceptionName.InvalidPriceFormat:
          this.clientMessage = ClientMessage.InvalidPrice;
          break;
        case ExceptionName.InvalidTPOrSLFormat:
          this.clientMessage = ClientMessage.InvalidTPOrSL;
          break;
        case ExceptionName.ExchangerNetworkException:
          this.clientMessage = ClientMessage.EXCHANGER_NETWORK;
          break;
        default:
          this.clientMessage = ClientMessage.GenericException;
      }
    }
  }
  getErrorCode() {
    return this.errorCode;
  }

  getClientMessage(): string {
    return this.clientMessage;
  }
  getType(): ExceptionName {
    return this.type;
  }
}
export { BotException, ExceptionName, ClientMessage };
