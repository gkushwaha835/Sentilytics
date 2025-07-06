import pandas as pd

df = pd.read_csv("Tweets.csv")
df = df[["text", "airline_sentiment"]]
df = df.rename(columns={"airline_sentiment": "sentiment"})
df = df[df["sentiment"].isin(["positive", "negative", "neutral"])]
df.to_csv("cleaned_sentiment_data.csv", index=False)
